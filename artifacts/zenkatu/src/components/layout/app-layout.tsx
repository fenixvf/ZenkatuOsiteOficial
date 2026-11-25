import { useEffect, useState } from "react";
import { GlobalHeader } from "./global-header";
import { Sidebar } from "./sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <GlobalHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
