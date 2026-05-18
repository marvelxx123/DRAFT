const fetch = require('node-fetch');

const BASE_URL = 'https://api.printful.com';

function headers() {
  return {
    'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID,
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error?.message || `Printful error ${res.status}`);
    err.code = res.status;
    err.raw = json;
    throw err;
  }
  return json.result;
}

/*
 * Maps our internal product keys to Printful variant IDs.
 * In production you'd call GET /products to build this dynamically.
 * These are representative Printful catalog IDs (Gildan 64000 tee, etc).
 */
const VARIANT_MAP = {
  tshirt: {
    XS: 4011, S: 4012, M: 4013, L: 4014, XL: 4015, '2XL': 4016,
  },
  hoodie: {
    XS: 2851, S: 2852, M: 2853, L: 2854, XL: 2855, '2XL': 2856,
  },
  mug:     { default: 1320 },
  cap:     { default: 5078 },
  tote:    { default: 2993 },
  glasses: { default: null }, // custom glasses require a custom integration
};

function resolveVariantId(product, size) {
  const map = VARIANT_MAP[product];
  if (!map) return null;
  return map[size] || map.default || null;
}

async function createOrder({ sessionId, customer, shippingAddress, items }) {
  const orderItems = items
    .map(item => {
      const variantId = resolveVariantId(item.product, item.size);
      if (!variantId) return null;

      const files = [];
      if (item.designUrl) {
        files.push({ type: 'front', url: item.designUrl });
      }
      if (item.text) {
        // Text-only designs use a pre-generated image URL stored at checkout time
        // (see checkout route — we generate a data URL → hosted URL conversion)
      }

      return {
        sync_variant_id: variantId,
        quantity: item.qty,
        files: files.length ? files : undefined,
        options: item.text
          ? [{ id: 'notes', value: `Custom text: ${item.text}` }]
          : undefined,
      };
    })
    .filter(Boolean);

  const order = await request('POST', '/orders', {
    external_id: sessionId,
    shipping: 'STANDARD',
    recipient: {
      name: customer.name,
      email: customer.email,
      address1: shippingAddress.line1,
      address2: shippingAddress.line2 || '',
      city: shippingAddress.city,
      state_code: shippingAddress.state,
      country_code: shippingAddress.country,
      zip: shippingAddress.postal_code,
    },
    items: orderItems,
  });

  // Confirm (submit) the order so Printful starts production
  const confirmed = await request('POST', `/orders/${order.id}/confirm`);
  return confirmed;
}

async function getShippingRates({ recipient, items }) {
  return request('POST', '/shipping/rates', { recipient, items });
}

async function getProducts() {
  return request('GET', '/store/products');
}

module.exports = { createOrder, getShippingRates, getProducts, resolveVariantId };
