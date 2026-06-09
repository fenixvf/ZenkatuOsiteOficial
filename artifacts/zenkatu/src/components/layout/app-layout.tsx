import { useEffect } from "react";
import { GlobalHeader } from "./global-header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <GlobalHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
