export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpjLength(value: string) {
  return onlyDigits(value).length === 14;
}

export type Socio = {
  nome: string;
  qualificacao: string | null;
  dataEntrada: string | null;
};

export type CnpjLookupResult = {
  cnpj: string;
  nome: string;
  razao_social: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  situacao_cadastral: string | null;
  segmento: string | null;
  // porte oficial da Receita Federal (classificação por faturamento do
  // Simples Nacional — não tem relação com número de funcionários).
  porte: string | null;
  socios: Socio[];
};

type BrasilApiSocio = {
  nome_socio?: string;
  qualificacao_socio?: string;
  data_entrada_sociedade?: string;
};

type BrasilApiCnpjResponse = {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  ddd_telefone_1?: string;
  email?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal_descricao?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  descricao_porte?: string;
  porte?: string;
  qsa?: BrasilApiSocio[];
};

/**
 * Consulta a Receita Federal (via BrasilAPI, gratuita e sem chave) a partir de
 * um CNPJ e normaliza a resposta para os campos usados em `clients`.
 */
export async function lookupCnpj(
  cnpj: string,
): Promise<CnpjLookupResult | null> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    // sem User-Agent o WAF da BrasilAPI responde 403 a requisições do Node
    headers: { "User-Agent": "CarteiraFarm/1.0 (+https://carteirafarm.internal)" },
    // dados cadastrais não mudam a cada segundo; evita bater na API à toa
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) return null;

  const data: BrasilApiCnpjResponse = await res.json();

  const endereco = [
    data.logradouro,
    data.numero,
    data.bairro,
    data.municipio && data.uf ? `${data.municipio}/${data.uf}` : undefined,
    data.cep,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    cnpj: onlyDigits(data.cnpj),
    nome: data.nome_fantasia?.trim() || data.razao_social,
    razao_social: data.razao_social,
    telefone: data.ddd_telefone_1 || null,
    email: data.email || null,
    endereco: endereco || null,
    situacao_cadastral: data.descricao_situacao_cadastral || null,
    segmento: data.cnae_fiscal_descricao || null,
    porte: data.descricao_porte || data.porte || null,
    socios: (data.qsa ?? [])
      .filter((s) => s.nome_socio)
      .map((s) => ({
        nome: s.nome_socio!,
        qualificacao: s.qualificacao_socio || null,
        dataEntrada: s.data_entrada_sociedade || null,
      })),
  };
}
