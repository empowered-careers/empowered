-- Add 'quarterly' to billing_cadence for Core/Pro subscriptions.
--
-- Core and Pro are offered monthly or quarterly. 'annual' stays in the enum
-- (removing an enum value requires recreating the type) but is no longer
-- offered. ADD VALUE is intentionally the only statement in this migration —
-- a new enum value can't be used in the same transaction it's added in.

alter type billing_cadence add value if not exists 'quarterly';
