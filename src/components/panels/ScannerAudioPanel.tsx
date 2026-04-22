import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip } from "@/components/PanelKit";
import { Play } from "lucide-react";

const FEED_URL = "https://www.broadcastify.com/listen/feed/33610";

const CHANNELS = [
  "Lawrence County Sheriff",
  "Fire & EMS Dispatch",
  "Lawrence County EMA",
];

export const ScannerAudioPanel = () => (
  <Panel
    title="Local Scanner · Audio"
    source="Broadcastify"
    sourceUrl={FEED_URL}
    action={
      <InfoTip>
        Live audio from Lawrence County 911 dispatch, Sheriff, Fire & EMS. Audio only — no structured incident data is available for this county.
      </InfoTip>
    }
  >
    <div className="space-y-3">
      <div className="font-mono text-xs text-foreground leading-relaxed">
        Live audio from Lawrence County 911 dispatch, Sheriff, Fire & EMS.
      </div>

      <div className="space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Channels monitored</div>
        {CHANNELS.map((c) => (
          <div key={c} className="font-mono text-[11px] text-foreground">
            · {c}
          </div>
        ))}
      </div>

      <a
        href={FEED_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-md border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent font-mono text-xs uppercase tracking-wider transition-colors"
      >
        <Play className="h-4 w-4 fill-current" /> Tune In
      </a>

      <ContextBox>
        For real-time emergency alerts, sign up for CodeRED at{" "}
        <a className="text-accent hover:underline" href="https://www.lawrencecountypa.gov/" target="_blank" rel="noreferrer">
          lawrencecountypa.gov
        </a>
        .
      </ContextBox>
    </div>
  </Panel>
);
