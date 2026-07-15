import type { NotificationItem } from "@/lib/notificacoes-feed";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

export function TopBar({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1 border-b border-chumbo/10 bg-background px-4 py-2 dark:border-white/10">
      <ThemeToggle />
      <NotificationBell items={notifications} />
    </div>
  );
}
