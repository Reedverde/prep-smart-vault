import { PageContainer } from "@/components/PageContainer";
import { Panel } from "@/components/Panel";
import { BookOpen } from "lucide-react";

const Library = () => (
  <PageContainer>
    <Panel title="Library">
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <BookOpen className="h-10 w-10 text-dim" />
        <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">Coming soon</h2>
        <p className="font-mono text-xs text-dim max-w-md">
          Document library with search, tags, and dual-write to Drive arrives in a later stage.
        </p>
      </div>
    </Panel>
  </PageContainer>
);

export default Library;
