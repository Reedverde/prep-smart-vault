import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserSettings = {
  user_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  ntfy_topic: string | null;
  alert_tier_1: boolean;
  alert_tier_2: boolean;
  alert_tier_3: boolean;
  channel_banner: boolean;
  channel_web_push: boolean;
  channel_email: boolean;
  channel_ntfy: boolean;
  refresh_interval_min: number;
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) setSettings(data as UserSettings);
    // If trigger hasn't fired yet, create row defensively
    if (!error && !data) {
      const { data: created } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id })
        .select()
        .single();
      if (created) setSettings(created as UserSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) return { error: new Error("Not authenticated") };
      const { data, error } = await supabase
        .from("user_settings")
        .update(patch)
        .eq("user_id", user.id)
        .select()
        .single();
      if (!error && data) setSettings(data as UserSettings);
      return { error };
    },
    [user],
  );

  return { settings, loading, reload: load, update };
};
