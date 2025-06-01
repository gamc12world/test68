import { loadStripe } from '@stripe/stripe-js';

// Replace with your Stripe publishable key
const stripePromise = loadStripe('pk_test_51RV6TMRjmScj5GX7ZE6FwvgTxCZtBKZCmOMGvTxyuw6vIBi8YTE5A423NIt12V9xzwz2CIGHAp2LaAEDF6TWJ6xj00YjyHUkz3');

export default stripePromise;