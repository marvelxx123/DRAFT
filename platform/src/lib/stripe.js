import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase.js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export const PLANS = {
  free: { name: 'Free', price: 0, credits: 30, priceId: null },
  starter: { name: 'Starter', price: 19, credits: 200, priceId: 'price_starter' },
  growth: { name: 'Growth', price: 49, credits: 600, priceId: 'price_growth' },
  pro: { name: 'Pro', price: 129, credits: 2000, priceId: 'price_pro' },
}

export async function createCheckoutSession(priceId, userId) {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId, userId, returnUrl: window.location.origin + '/billing' },
  })
  if (error) throw new Error(error.message)
  const stripe = await stripePromise
  await stripe.redirectToCheckout({ sessionId: data.sessionId })
}

export async function createPortalSession(customerId) {
  const { data, error } = await supabase.functions.invoke('create-portal', {
    body: { customerId, returnUrl: window.location.origin + '/billing' },
  })
  if (error) throw new Error(error.message)
  window.location.href = data.url
}
