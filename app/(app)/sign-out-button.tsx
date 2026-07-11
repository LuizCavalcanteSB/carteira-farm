"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton({
  className,
  icon,
}: {
  className?: string;
  icon?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className={className ?? "text-zinc-200 hover:text-brand"}
    >
      {icon}
      Sair
    </button>
  );
}
