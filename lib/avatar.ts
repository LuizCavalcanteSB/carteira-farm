const CORES = [
  "bg-amber-700",
  "bg-teal-700",
  "bg-violet-700",
  "bg-rose-700",
  "bg-blue-700",
  "bg-orange-700",
  "bg-cyan-700",
  "bg-lime-700",
  "bg-pink-700",
  "bg-slate-600",
];

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

/** Cor determinística a partir do nome — o mesmo cliente sempre cai na
 * mesma cor, sem precisar guardar isso no banco. */
export function corDoAvatar(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return CORES[hash % CORES.length];
}
