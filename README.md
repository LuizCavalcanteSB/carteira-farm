# Carteira Farm

Dashboard de carteira de clientes para o squad comercial: busca por nome/CNPJ,
ficha do cliente (observações, pedidos, fotos dos bonés), importação em massa
por planilha e preenchimento automático de dados via Receita Federal.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage)
- SheetJS (`xlsx`) para ler as planilhas importadas
- BrasilAPI para consultar CNPJ na Receita Federal

## Configuração inicial (uma vez só)

1. **Crie um projeto gratuito em [supabase.com](https://supabase.com).**

2. **Rode o schema do banco**: abra o SQL Editor do projeto Supabase e
   execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Isso
   cria as tabelas, as policies de segurança (cada consultor só vê a própria
   carteira) e o bucket de fotos.

3. **Configure as variáveis de ambiente**: copie `.env.local.example` para
   `.env.local` e preencha com a URL e a "anon key" do seu projeto Supabase
   (em Project Settings → API).

   ```
   cp .env.local.example .env.local
   ```

4. **Desative a confirmação por e-mail** (obrigatório): em Authentication →
   Sign In / Providers → Email, desligue "Confirm email". O login aqui é só
   usuário + senha — por trás, o app gera um e-mail sintético interno
   (`usuario@carteirafarm.internal`, ver `lib/username.ts`) só para satisfazer
   o Supabase Auth. Como esse e-mail não existe de verdade, se a confirmação
   ficar ligada ninguém consegue confirmar a conta e o cadastro trava.

5. **Instale as dependências e rode localmente**:

   ```
   npm install
   npm run dev
   ```

   Acesse http://localhost:3000/cadastro — cada um dos 10 consultores cria a
   própria conta escolhendo usuário e senha (sem precisar de e-mail).

6. **Promova o primeiro admin (coordenador do squad)**: depois que a pessoa se
   cadastrar normalmente pela tela acima, abra a tabela `profiles` no Table
   Editor do Supabase e mude o campo `role` dela de `consultor` para `admin`.
   Esse papel nunca pode ser escolhido pelo próprio formulário de cadastro,
   por segurança. Esse é o único passo manual — a partir daí, esse admin já
   consegue promover ou rebaixar qualquer outra pessoa direto pela tela
   **Consultores** (`/admin`) dentro do próprio app, sem precisar voltar ao
   Supabase.

## Importação de planilha

Em "Importar planilha", suba um `.xlsx` com colunas (nomes flexíveis, o
sistema reconhece variações comuns):

| Coluna esperada | Obrigatória? |
| --- | --- |
| `cnpj` | Sim |
| `nome` | Não — se vazio, é buscado na Receita Federal |
| `telefone`, `email`, `segmento` | Não — idem |
| `contato`, `comprador`, `cidade` | Não |
| `status` (`ativo` / `inativo` / `prospeccao`) | Não — padrão `ativo` |
| `perfil` (`Dono ou Sócio` / `Funcionários` / `Agência` / `Revendedor` / `Brindeiro`) | Não |
| `porte` (`Grande` / `Médio` / `Pequeno`) | Não |
| `qtd compras`, `faturamento total` | Não — histórico de compras anterior ao sistema; some-se aos pedidos lançados no app nos cards da ficha do cliente |
| `1a compra`, `última compra` | Não — datas do histórico; aceitam célula de data da planilha ou texto no formato dd/mm/aaaa |
| `consultor` (**usuário/login** do consultor — não o nome, só para quem importa como admin) | Não — se vazio ou não encontrado, o cliente fica com quem importou |

Reimportar a mesma planilha atualiza o cadastro existente (casando pelo CNPJ).
Se uma coluna de histórico vier em branco numa reimportação, o valor que já
estava salvo é preservado — não zera o que já tinha sido importado antes.

A planilha modelo para os consultores usarem no dia a dia (com aba de
instruções, dropdown de status e linhas de exemplo para apagar) está em
[`sample-data/modelo-clientes.xlsx`](sample-data/modelo-clientes.xlsx).

## Deploy

1. Suba este repositório no GitHub.
2. Importe o projeto na [Vercel](https://vercel.com/new).
3. Configure as mesmas variáveis `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` no painel da Vercel.
4. Deploy. A URL gerada é o que os 10 consultores vão acessar.

## O que fica para uma v2

- Exportar ficha do cliente em PDF
- Alertas de clientes "esfriando" (sem pedido há X dias)

## Observação de segurança

O pacote `xlsx` (SheetJS) instalado via npm tem vulnerabilidades conhecidas
sem correção no registro oficial (prototype pollution / ReDoS ao processar
arquivos maliciosos). Como a importação é usada só pelos consultores
internos, o risco é baixo, mas evite abrir planilhas de origem desconhecida
nessa tela. Se quiser eliminar o risco, é possível trocar pela build corrigida
publicada pelo próprio SheetJS fora do npm — avise se quiser que eu faça essa
troca.
