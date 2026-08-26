-- 0006_payments_reference.sql
-- Switch payments from Stripe to Paystack: the external idempotency key is now a
-- generic transaction reference. Renaming keeps the existing UNIQUE index.

ALTER TABLE payments RENAME COLUMN stripe_session_id TO reference;
