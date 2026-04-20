import { PageContainer } from "@/components/PageContainer";
import { Panel } from "@/components/Panel";
import { Activity } from "lucide-react";

const Operations = () => (
  <PageContainer>
    <Panel title="Operations">
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Activity className="h-10 w-10 text-dim" />
        <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">Coming soon</h2>
        <p className="font-mono text-xs text-dim max-w-md">
          Operational checklists, plans, and inventory tracking arrive in a later stage.
        </p>
      </div>
    </Panel>
  </PageContainer>
);

export default Operations;
