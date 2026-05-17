const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const printful = require('../services/printful');

/*
 * POST /api/webhooks/stripe
 *
 * Stripe sends signed events here. We verify the signature, then:
 *   checkout.session.completed → create Printful order
 *   charge.refunded            → cancel Printful order if not yet shipped
 *
 * Raw body is required for signature verification — express.raw() is
 * applied in server/index.js for this route only.
 */
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Acknowledge immediately — Stripe retries if we don't respond within 30s
  res.json({ received: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        // Unhandled event type — not an error, just ignore
        break;
    }
  } catch (err) {
    // Log but don't re-send 500 (already responded)
    console.error(`[webhook] Error processing ${event.type}:`, err.message, err.raw || '');
  }
});

async function handleCheckoutCompleted(session) {
  if (session.payment_status !== 'paid') return;

  let items;
  try {
    items = JSON.parse(session.metadata.items || '[]');
  } catch {
    console.error('[webhook] Could not parse items metadata');
    return;
  }

  if (items.length === 0) {
    console.warn('[webhook] No items in session metadata, skipping Printful order');
    return;
  }

  const shipping = session.shipping_details;
  const customer = session.customer_details;

  if (!shipping?.address) {
    console.error('[webhook] No shipping address in session', session.id);
    return;
  }

  const order = await printful.createOrder({
    sessionId: session.id,
    customer: {
      name: customer?.name || shipping.name,
      email: customer?.email || '',
    },
    shippingAddress: shipping.address,
    items,
  });

  console.log(`[webhook] Printful order created: ${order.id} for session ${session.id}`);
}

async function handleRefund(charge) {
  // Printful orders can only be cancelled before printing starts.
  // Look up by external_id (= Stripe session id) and attempt cancel.
  // In a real app you'd store the Printful order ID in your DB at creation time.
  console.log(`[webhook] Refund received for charge ${charge.id} — manual Printful cancel may be required.`);
}

/*
 * POST /api/webhooks/printful
 *
 * Printful sends status updates here (package_shipped, etc).
 * Verify using the shared secret in X-Printful-Signature header.
 */
router.post('/printful', express.json(), (req, res) => {
  const receivedSig = req.headers['x-printful-signature'];
  const expectedSig = process.env.PRINTFUL_WEBHOOK_SECRET;

  if (expectedSig && receivedSig !== expectedSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, data } = req.body;
  console.log(`[printful-webhook] ${type}`, JSON.stringify(data, null, 2));

  switch (type) {
    case 'package_shipped':
      // data.shipment.tracking_url, data.order.external_id
      // → send tracking email to customer here
      break;
    case 'order_failed':
      // → alert operator, potentially refund via Stripe
      break;
    case 'order_canceled':
      break;
    default:
      break;
  }

  res.json({ ok: true });
});

module.exports = router;
