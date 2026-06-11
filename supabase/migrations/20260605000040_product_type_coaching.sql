-- À la carte coaching modules / session packs need a payments.product_type
-- value. The existing enum only had per-service categories (resume_review,
-- linkedin_review, interview_prep) + subscription/webinar; add 'coaching' as
-- the catch-all so the webhook can record coaching purchases honestly instead
-- of mis-tagging them. ADD VALUE is the only statement in this migration.

alter type product_type add value if not exists 'coaching';
