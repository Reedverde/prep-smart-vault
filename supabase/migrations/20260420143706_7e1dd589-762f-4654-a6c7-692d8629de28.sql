
-- ============ user_settings ============
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL DEFAULT 'New Castle, PA',
  latitude DOUBLE PRECISION NOT NULL DEFAULT 41.0034,
  longitude DOUBLE PRECISION NOT NULL DEFAULT -80.3470,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  airnow_api_key TEXT,
  acled_email TEXT,
  acled_api_key TEXT,
  ntfy_topic TEXT,
  alert_tier_1 BOOLEAN NOT NULL DEFAULT true,
  alert_tier_2 BOOLEAN NOT NULL DEFAULT true,
  alert_tier_3 BOOLEAN NOT NULL DEFAULT false,
  channel_banner BOOLEAN NOT NULL DEFAULT true,
  channel_web_push BOOLEAN NOT NULL DEFAULT true,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  channel_ntfy BOOLEAN NOT NULL DEFAULT false,
  refresh_interval_min INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ============ snapshots ============
CREATE TABLE public.snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual','auto')),
  title TEXT,
  notes TEXT,
  dashboard_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  screenshot_url TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_snapshots_user_captured ON public.snapshots(user_id, captured_at DESC);

CREATE POLICY "Users view own snapshots" ON public.snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own snapshots" ON public.snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own snapshots" ON public.snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own snapshots" ON public.snapshots
  FOR DELETE USING (auth.uid() = user_id);

-- ============ alerts ============
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  tier SMALLINT NOT NULL CHECK (tier IN (1,2,3)),
  severity TEXT,
  event_type TEXT,
  headline TEXT NOT NULL,
  description TEXT,
  area_desc TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  delivered_channels TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, external_id)
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_alerts_user_issued ON public.alerts(user_id, issued_at DESC);
CREATE INDEX idx_alerts_user_active ON public.alerts(user_id) WHERE dismissed_at IS NULL;

CREATE POLICY "Users view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alerts" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own alerts" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);

-- ============ inventory_items ============
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC,
  unit TEXT,
  expires_at DATE,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventory_user ON public.inventory_items(user_id);

CREATE POLICY "Users view own inventory" ON public.inventory_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own inventory" ON public.inventory_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own inventory" ON public.inventory_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own inventory" ON public.inventory_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============ library_docs ============
CREATE TABLE public.library_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  doc_type TEXT,
  storage_path TEXT,
  drive_file_id TEXT,
  original_filename TEXT,
  mime_type TEXT,
  page_count INTEGER,
  text_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.library_docs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_library_user ON public.library_docs(user_id);

CREATE POLICY "Users view own docs" ON public.library_docs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own docs" ON public.library_docs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own docs" ON public.library_docs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own docs" ON public.library_docs
  FOR DELETE USING (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_library_updated BEFORE UPDATE ON public.library_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ auto-create user_settings on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
