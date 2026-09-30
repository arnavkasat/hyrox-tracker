import type { ReactNode } from "react";

import { MotionProvider } from "@/components/ios/motion-provider";
import { TabBar } from "@/components/ios/tab-bar";
import { TimezoneSync } from "@/components/timezone-sync";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <div className="mx-auto h-full max-w-lg">
        {children}
        <TabBar />
        <TimezoneSync />
      </div>
    </MotionProvider>
  );
}
