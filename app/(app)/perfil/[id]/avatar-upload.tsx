"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerAvatar } from "./actions";

export function AvatarUpload({
  profileId,
  avatarUrl,
  nome,
}: {
  profileId: string;
  avatarUrl: string | null;
  nome: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profileId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const result = await registerAvatar(profileId, path);
    if (result?.error) setError(result.error);

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-chumbo-light">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-400">
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={isUploading}
        className="text-xs"
      />
      {isUploading && <p className="text-xs text-zinc-400">Enviando...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
