"use client";

import { useEffect } from "react";

// Bipe sintetizado (Web Audio API) — sem depender de nenhum arquivo de
// áudio. Toca uma vez quando a página abre e há pelo menos uma notificação.
export function NotificationSound({ tocar }: { tocar: boolean }) {
  useEffect(() => {
    if (!tocar) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();

    function bipe(frequencia: number, inicio: number, duracao: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequencia;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + inicio + duracao,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao);
    }

    bipe(880, 0, 0.15);
    bipe(1108, 0.15, 0.2);

    return () => {
      void ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
