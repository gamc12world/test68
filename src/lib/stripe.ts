import { loadStripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const stripePromise = loadStripe('pk_test_51OpLZmBH5Qz41234567890abcdefghijklmnopqrstuvwxyz');

export default stripePromise;