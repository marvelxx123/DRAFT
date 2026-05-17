const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCT_PRICES = {
  tshirt:  2499,
  glasses: 3499,
  mug:     1499,
  hoodie:  4499,
  cap:     2299,
  tote:    1899,
};

const PRODUCT_NAMES = {
  tshirt:  'Custom T-Shirt',
  glasses: 'Custom Glasses',
  mug:     'Custom Mug',
  hoodie:  'Custom Hoodie',
  cap:     'Custom Cap',
  tote:    'Custom Tote Bag',
};

/*
 * POST /api/checkout
 * Body: { items: [{ product, qty, color, size, text, designSrc }] }
 * Returns: { url } — Stripe Checkout hosted page
 */
router.post('/', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const line_items = items.map(item => {
      const unitAmount = PRODUCT_PRICES[item.product];
      if (!unitAmount) throw new Error(`Unknown product: ${item.product}`);

      const name = PRODUCT_NAMES[item.product] || item.product;
      const descParts = [];
      if (item.color) descParts.push(`Color: ${item.colorName || item.color}`);
      if (item.size) descParts.push(`Size: ${item.size}`);
      if (item.text) descParts.push(`Text: "${item.text}"`);

      return {
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name,
            description: descParts.join(' · ') || 'Custom print on demand',
          },
        },
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: [
          'US','CA','GB','AU','DE','FR','NL','SE','NO','DK','FI',
          'IT','ES','PT','BE','AT','CH','PL','CZ','HU','RO','GR',
          'JP','SG','NZ','IE','MX','BR',
        ],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1299, currency: 'usd' },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 4 },
            },
          },
        },
      ],
      metadata: {
        items: JSON.stringify(
          items.map(i => ({
            product: i.product,
            qty: i.qty,
            color: i.color,
            size: i.size || null,
            text: i.text || null,
            // designSrc is a data URL — too large for metadata.
            // In production: upload to S3/Cloudinary first, store the URL here.
            designUrl: i.designUrl || null,
          }))
        ),
      },
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/#customizer`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/*
 * GET /api/checkout/session/:id
 * Returns session details for the success page.
 */
router.get('/session/:id', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['line_items', 'shipping_details'],
    });
    res.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      shippingName: session.shipping_details?.name,
      amount: (session.amount_total / 100).toFixed(2),
    });
  } catch (err) {
    res.status(404).json({ error: 'Session not found' });
  }
});

module.exports = router;
