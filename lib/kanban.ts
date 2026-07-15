export type EstagioContato =
  | "contato_novo"
  | "apresentacao_realizada"
  | "em_producao"
  | "pedido_entregue";

export const ESTAGIOS_CONTATO: EstagioContato[] = [
  "contato_novo",
  "apresentacao_realizada",
  "em_producao",
  "pedido_entregue",
];

export const ESTAGIO_CONTATO_LABEL: Record<EstagioContato, string> = {
  contato_novo: "Contato novo",
  apresentacao_realizada: "Apresentação realizada",
  em_producao: "Em produção",
  pedido_entregue: "Pedido entregue",
};

export const ESTAGIO_CONTATO_COLOR: Record<EstagioContato, string> = {
  contato_novo: "bg-sky-500",
  apresentacao_realizada: "bg-amber-500",
  em_producao: "bg-violet-500",
  pedido_entregue: "bg-emerald-500",
};
