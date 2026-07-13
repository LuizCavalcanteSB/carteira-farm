type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Busca todas as linhas de uma consulta, em páginas, para não esbarrar no
 * limite padrão de linhas por resposta do PostgREST (1000). Sem isso, uma
 * tabela que cresça além do limite tem o restante cortado silenciosamente —
 * já causou clientes aleatórios aparecerem com pedidos/observações/fotos
 * zerados sem nenhum dado ter sido realmente apagado.
 */
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<{ data: T[]; error: boolean }> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryPage(from, from + pageSize - 1);
    if (error) return { data: all, error: true };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return { data: all, error: false };
}
