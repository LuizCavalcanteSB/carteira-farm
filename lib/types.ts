export type Role = "consultor" | "admin";

export type Profile = {
  id: string;
  nome: string;
  username: string;
  role: Role;
  avatar_path: string | null;
  created_at: string;
};

export type MetaMensal = {
  id: string;
  consultant_id: string;
  ano: number;
  mes: number;
  valor_meta: number;
  created_at: string;
  updated_at: string;
};

export type ClientStatus = "ativo" | "inativo" | "prospeccao";

export type PerfilComprador =
  | "dono_socio"
  | "funcionarios"
  | "agencia"
  | "revendedor"
  | "brindeiro";

export type Porte = "grande" | "medio" | "pequeno";

export type Client = {
  id: string;
  nome: string;
  cnpj: string;
  razao_social: string | null;
  telefone: string | null;
  email: string | null;
  contato: string | null;
  comprador: string | null;
  segmento: string | null;
  endereco: string | null;
  cidade: string | null;
  situacao_cadastral: string | null;
  status: ClientStatus;
  perfil_comprador: PerfilComprador | null;
  porte: Porte | null;
  historico_qtd_compras: number;
  historico_faturamento_total: number;
  historico_primeira_compra: string | null;
  historico_ultima_compra: string | null;
  consultant_id: string;
  created_at: string;
};

export type Order = {
  id: string;
  client_id: string;
  data_pedido: string;
  valor: number;
  descricao: string | null;
  created_at: string;
};

export type ClientNote = {
  id: string;
  client_id: string;
  author_id: string;
  conteudo: string;
  created_at: string;
};

export type OrderPhoto = {
  id: string;
  client_id: string;
  order_id: string | null;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
};
