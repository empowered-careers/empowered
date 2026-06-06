-- Publish `payments` to Supabase Realtime so the candidate-facing
-- `usePaymentNotifications` hook can toast on a confirmed purchase instead of
-- polling `/checkout/success`. Every successful charge (subscription create,
-- renewal, and à la carte one-time) inserts a `payments` row with
-- status = 'succeeded', so an INSERT subscription filtered by profile_id is the
-- single signal the hook needs.
--
-- RLS already restricts SELECT to own rows (payments_self_read), which Realtime
-- honours, so no policy change is needed. REPLICA IDENTITY FULL keeps parity
-- with the other published tables (resumes / linkedin_profiles / applications).

ALTER TABLE public.payments REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
