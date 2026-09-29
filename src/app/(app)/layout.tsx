import type { ReactNode } from "react";
import { TabBar } from "@/components/ios/tab-bar";
import { TimezoneSync } from "@/components/timezone-sync";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-full max-w-lg">
      {children}
      <TabBar />
      <TimezoneSync />
    </div>
  );
}
