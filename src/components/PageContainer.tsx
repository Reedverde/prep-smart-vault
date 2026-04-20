import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { cn } from "@/lib/utils";

export const PageContainer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className="min-h-screen bg-background flex flex-col">
    <TopNav />
    <main className={cn("flex-1 px-4 md:px-6 py-6 max-w-[1600px] w-full mx-auto", className)}>
      {children}
    </main>
  </div>
);
