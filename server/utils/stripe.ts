import Stripe from 'stripe';

let stripe: Stripe | null = null;

/**
 * Initialize the Stripe client.
 * - In production, expects STRIPE_SECRET_KEY to be set and disables Stripe if missing.
 * - In development/testing, uses a dummy key when STRIPE_SECRET_KEY is not provided.
 */
export function initializeStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('STRIPE_SECRET_KEY not set; Stripe features disabled');
      return null;
    }
    // Use dummy key so Stripe library can be instantiated without hitting real APIs
    stripe = new Stripe('sk_test_dummy', { apiVersion: '2023-10-16' });
    console.log('Using dummy Stripe key for development/test');
  } else {
    stripe = new Stripe(key, { apiVersion: '2023-10-16' });
  }
  return stripe;
}

export function getStripe() {
  return stripe;
}
