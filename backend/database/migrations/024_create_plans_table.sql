-- Pricing plans table for admin-editable plans (replaces hardcoded plans in code)
-- Run in Supabase SQL Editor or via migration tool.

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  period text NOT NULL DEFAULT 'month',
  description text,
  features jsonb NOT NULL DEFAULT '[]',
  popular boolean NOT NULL DEFAULT false,
  color text,
  limits_searches int NOT NULL DEFAULT 20,
  limits_api_calls int NOT NULL DEFAULT 0,
  limits_storage_mb int NOT NULL DEFAULT 1024,
  trial_days int,
  trial_price numeric(10,2),
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS 'Admin-editable pricing plans; used by landing, billing, and backend limits when present';

CREATE INDEX IF NOT EXISTS idx_plans_tier ON public.plans(tier);
CREATE INDEX IF NOT EXISTS idx_plans_active_order ON public.plans(active, display_order);

-- RLS: allow read for all authenticated (for billing/landing), write for service role only (admin API uses service key)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.plans
  FOR SELECT USING (true);

CREATE POLICY "Allow all for service role" ON public.plans
  FOR ALL USING (auth.role() = 'service_role');

-- Seed with current app defaults (match plans.ts)
INSERT INTO public.plans (tier, name, price, currency, period, description, features, popular, color, limits_searches, limits_api_calls, limits_storage_mb, trial_days, trial_price, display_order, active)
VALUES
  ('free', 'Starter / Basic', 12.99, 'GBP', 'month', 'For small users testing the service',
   '["20 analyses per month","Basic search & match results","Web portal access"]'::jsonb,
   false, 'from-gray-600 to-gray-700', 20, 0, 1024, 30, 15, 1, true),
  ('pro', 'Professional / Business', 69.99, 'GBP', 'month', 'For SMEs managing spare parts more actively',
   '["500 analyses per month","Catalogue storage (part lists, drawings)","API access for ERP/CMMS","Analytics dashboard","Web portal access"]'::jsonb,
   true, 'from-purple-600 to-blue-600', 500, 5000, 25600, 7, null, 2, true),
  ('enterprise', 'Enterprise', 460, 'GBP', 'month', 'For OEMs, large factories, distributors',
   '["Unlimited analyses","Advanced AI customisation (train on your data)","ERP/CMMS full integration","Predictive demand analytics","Dedicated support & SLA","Web portal access"]'::jsonb,
   false, 'from-emerald-600 to-green-600', -1, -1, -1, null, null, 3, true)
ON CONFLICT (tier) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_plans_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_plans_updated_at();
