import { createContext, useContext, ReactNode } from "react";
import { usePushNotifications, UsePushNotificationsReturn } from "@/hooks/use-push-notifications";
import { useAuth } from "@/lib/auth-context";

const PushNotificationsContext = createContext<UsePushNotificationsReturn | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const push = usePushNotifications(currentUser?.uid ?? null);

  return (
    <PushNotificationsContext.Provider value={push}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotificationsContext(): UsePushNotificationsReturn {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) throw new Error("usePushNotificationsContext must be used inside PushNotificationsProvider");
  return ctx;
}
