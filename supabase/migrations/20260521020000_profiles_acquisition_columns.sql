-- Profiles acquisition tracking.
--
-- Set at OAuth callback when an incoming signup's email matches an existing
-- leads row. `acquisition_source` mirrors leads.source at conversion time so
-- attribution analytics don't need a join.

alter table profiles
  add column lead_id            uuid references leads(id) on delete set null,
  add column acquisition_source text,
  add column acquisition_ref    text;

create index profiles_lead_id_idx on profiles(lead_id) where lead_id is not null;
create index profiles_acquisition_source_idx on profiles(acquisition_source) where acquisition_source is not null;
