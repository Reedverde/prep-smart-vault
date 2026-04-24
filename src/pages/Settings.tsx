import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserSettings, UserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode, detectBrowserTimezone } from "@/lib/geocode";
import { toast } from "sonner";
import { Loader2, MapPin, LogOut, Crosshair } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

const Settings = () => {
  const { settings, loading, update } = useUserSettings();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading || !settings) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-dim" />
        </div>
      </PageContainer>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="font-mono text-xl uppercase tracking-wider text-foreground">Settings</h1>
        <p className="font-mono text-xs text-dim mt-1">Changes save automatically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LocationSection settings={settings} update={update} />
        <AlertsSection settings={settings} update={update} />
        <AccountSection
          user={user}
          provider={user?.app_metadata?.provider || "email"}
          onSignOut={handleSignOut}
        />
      </div>
    </PageContainer>
  );
};

// ============ LOCATION ============
const LocationSection = ({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (p: Partial<UserSettings>) => Promise<{ error: any }>;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(settings.location_name);
  const [lat, setLat] = useState(String(settings.latitude));
  const [lng, setLng] = useState(String(settings.longitude));
  const { getCurrentPosition, loading: geoLoading } = useGeolocation();
  const [detecting, setDetecting] = useState(false);

  const useCurrentLocation = async (autoSave: boolean) => {
    try {
      setDetecting(true);
      const coords = await getCurrentPosition();
      const latN = coords.latitude;
      const lngN = coords.longitude;
      setLat(latN.toFixed(6));
      setLng(lngN.toFixed(6));

      let resolvedName = `${latN.toFixed(3)}, ${lngN.toFixed(3)}`;
      try {
        const geo = await reverseGeocode(latN, lngN);
        if (geo.name) resolvedName = geo.name;
      } catch {
        // Non-fatal — keep coords as the name fallback
      }
      setName(resolvedName);

      const tz = detectBrowserTimezone();

      if (autoSave) {
        const patch: Partial<UserSettings> = {
          location_name: resolvedName,
          latitude: latN,
          longitude: lngN,
        };
        if (tz) patch.timezone = tz;
        const { error } = await update(patch);
        if (error) toast.error(error.message);
        else {
          toast.success(`Location set to ${resolvedName}`);
          setOpen(false);
        }
      } else {
        toast.success(`Detected ${resolvedName}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not detect location");
    } finally {
      setDetecting(false);
    }
  };

  const save = async () => {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (isNaN(latN) || isNaN(lngN)) {
      toast.error("Invalid coordinates");
      return;
    }
    const { error } = await update({ location_name: name, latitude: latN, longitude: lngN });
    if (error) toast.error(error.message);
    else {
      toast.success("Location updated");
      setOpen(false);
    }
  };

  const setTimezone = async (tz: string) => {
    const { error } = await update({ timezone: tz });
    if (error) toast.error(error.message);
    else toast.success("Timezone updated");
  };

  return (
    <Panel title="Location">
      <div className="space-y-4">
        <div className="rounded-md bg-inset border border-border/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-sm text-foreground">{settings.location_name}</span>
              </div>
              <div className="font-mono text-xs text-dim">
                {settings.latitude.toFixed(4)}, {settings.longitude.toFixed(4)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs uppercase"
                onClick={() => useCurrentLocation(true)}
                disabled={detecting || geoLoading}
              >
                {detecting || geoLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5" />
                )}
                Use my location
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="font-mono text-xs uppercase">
                    Edit manually
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono uppercase tracking-wider text-sm">
                      Update Location
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full font-mono text-xs uppercase"
                      onClick={() => useCurrentLocation(false)}
                      disabled={detecting || geoLoading}
                    >
                      {detecting || geoLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crosshair className="h-3.5 w-3.5" />
                      )}
                      Detect current location
                    </Button>
                    <div className="space-y-1.5">
                      <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
                        Name
                      </Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
                          Latitude
                        </Label>
                        <Input value={lat} onChange={(e) => setLat(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
                          Longitude
                        </Label>
                        <Input value={lng} onChange={(e) => setLng(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={save}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
            Timezone
          </Label>
          <Select value={settings.timezone} onValueChange={setTimezone}>
            <SelectTrigger className="font-mono text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz} className="font-mono text-sm">
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Panel>
  );
};

// ============ ALERTS ============
const AlertsSection = ({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (p: Partial<UserSettings>) => Promise<{ error: any }>;
}) => {
  const toggle = async (key: keyof UserSettings, value: boolean) => {
    const { error } = await update({ [key]: value } as Partial<UserSettings>);
    if (error) toast.error(error.message);
  };

  const [topic, setTopic] = useState(settings.ntfy_topic || "");

  const saveTopic = async () => {
    const { error } = await update({ ntfy_topic: topic || null });
    if (error) toast.error(error.message);
    else toast.success("ntfy topic saved");
  };

  return (
    <Panel title="Alerts & Notifications" className="lg:row-span-2">
      <div className="space-y-5">
        {/* Tier toggles */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-2">
            Alert Tiers
          </div>
          <TierCard
            color="critical"
            label="Tier 1 — Critical"
            description="Immediate threats: tornado, tsunami, severe earthquake nearby"
            checked={settings.alert_tier_1}
            onChange={(v) => toggle("alert_tier_1", v)}
          />
          <TierCard
            color="severe"
            label="Tier 2 — Significant"
            description="Severe weather watches, large quakes, major space weather"
            checked={settings.alert_tier_2}
            onChange={(v) => toggle("alert_tier_2", v)}
          />
          <TierCard
            color="accent"
            label="Tier 3 — Informational"
            description="Advisories, minor events, situational updates"
            checked={settings.alert_tier_3}
            onChange={(v) => toggle("alert_tier_3", v)}
          />
        </div>

        {/* Channels */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-2">
            Delivery Channels
          </div>
          <ChannelRow label="Banner" checked={settings.channel_banner} onChange={(v) => toggle("channel_banner", v)} />
          <ChannelRow label="Web Push" checked={settings.channel_web_push} onChange={(v) => toggle("channel_web_push", v)} />
          <ChannelRow label="Email" checked={settings.channel_email} onChange={(v) => toggle("channel_email", v)} />
          <ChannelRow label="ntfy.sh" checked={settings.channel_ntfy} onChange={(v) => toggle("channel_ntfy", v)} />
        </div>

        {/* ntfy topic */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
            ntfy.sh Topic
          </Label>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="preppi-alerts-xxxx"
              className="bg-inset font-mono text-sm"
            />
            <Button size="sm" variant="outline" onClick={saveTopic} className="font-mono text-xs">
              Save
            </Button>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            Subscribe to this topic in the ntfy app to receive push alerts to your phone.
          </p>
        </div>
      </div>
    </Panel>
  );
};

const TierCard = ({
  color,
  label,
  description,
  checked,
  onChange,
}: {
  color: "critical" | "severe" | "accent";
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => {
  const borderClass = {
    critical: "border-severity-critical/40 bg-severity-critical/5",
    severe: "border-severity-moderate/40 bg-severity-moderate/5",
    accent: "border-accent/40 bg-accent/5",
  }[color];

  return (
    <div className={`rounded-md border ${borderClass} p-3 flex items-start justify-between gap-3`}>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs uppercase tracking-wider text-foreground">{label}</div>
        <div className="font-mono text-[10px] text-dim mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
};

const ChannelRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="font-mono text-xs text-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

// ============ ACCOUNT ============
const AccountSection = ({
  user,
  provider,
  onSignOut,
}: {
  user: any;
  provider: string;
  onSignOut: () => void;
}) => {
  const [newPw, setNewPw] = useState("");
  const isEmail = provider === "email";

  const changePassword = async () => {
    if (!newPw || newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setNewPw("");
    }
  };

  return (
    <Panel title="Account">
      <div className="space-y-4">
        <Field label="Email" value={user?.email || "—"} />
        <Field label="Signed in via" value={provider} />
        <Field
          label="Member since"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
        />

        {isEmail && (
          <div className="pt-3 border-t border-border space-y-2">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-dim">
              Change password
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="bg-inset font-mono text-sm"
              />
              <Button size="sm" variant="outline" onClick={changePassword} className="font-mono text-xs">
                Update
              </Button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border">
          <Button variant="destructive" onClick={onSignOut} className="font-mono text-xs uppercase">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </Panel>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="font-mono text-[10px] uppercase tracking-wider text-dim">{label}</div>
    <div className="font-mono text-sm text-foreground mt-0.5 break-all">{value}</div>
  </div>
);

export default Settings;
