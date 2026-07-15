"use client";

import { useRouter } from "next/navigation";

export function MonthPicker({
  profileId,
  value,
}: {
  profileId: string;
  value: string;
}) {
  const router = useRouter();

  return (
    <input
      type="month"
      value={value}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/perfil/${profileId}?mes=${e.target.value}`);
        }
      }}
      className="rounded-md border border-white/20 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
    />
  );
}
