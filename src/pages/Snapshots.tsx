import { PageContainer } from "@/components/PageContainer";
import { Panel } from "@/components/Panel";
import { Camera } from "lucide-react";

const Snapshots = () => (
  <PageContainer>
    <Panel title="Snapshots">
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Camera className="h-10 w-10 text-dim" />
        <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">No snapshots yet</h2>
        <p className="font-mono text-xs text-dim max-w-md">
          Snapshot capture, browsing, and 30-day auto-cleanup arrive in Stage 3.
        </p>
      </div>
    </Panel>
  </PageContainer>
);

export default Snapshots;
