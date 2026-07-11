-- CARTEIRA FARM — schema do banco (rodar uma vez no SQL Editor do Supabase)

-- 1. Perfis (espelha auth.users, guarda nome, usuário e papel de cada pessoa)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  role text not null default 'consultor' check (role in ('consultor', 'admin')),
  avatar_path text,
  created_at timestamptz not null default now()
);

-- Cria automaticamente um profile quando um usuário se cadastra pela tela
-- /cadastro do app (que já envia nome/username/role via user_metadata). O
-- login usa apenas usuário + senha — o app gera um e-mail sintético interno
-- só para satisfazer o Supabase Auth (ver lib/username.ts), nunca exibido.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'consultor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Clientes
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text not null unique check (cnpj ~ '^\d{14}$'), -- somente dígitos, sem máscara
  razao_social text,
  telefone text,
  email text,
  contato text,
  comprador text,
  segmento text,
  endereco text,
  cidade text,
  situacao_cadastral text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'prospeccao')),
  perfil_comprador text check (
    perfil_comprador in ('dono_socio', 'funcionarios', 'agencia', 'revendedor', 'brindeiro')
  ),
  porte text check (porte in ('grande', 'medio', 'pequeno')),
  -- histórico de compras anterior à entrada no sistema (ex: importado de
  -- planilha legada). Some-se aos pedidos lançados no app para compor os
  -- totais exibidos na ficha do cliente (ver view client_stats).
  historico_qtd_compras int not null default 0,
  historico_faturamento_total numeric(12, 2) not null default 0,
  historico_primeira_compra date,
  historico_ultima_compra date,
  consultant_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm;

create index clients_consultant_id_idx on public.clients (consultant_id);
create index clients_nome_idx on public.clients using gin (nome gin_trgm_ops);

-- 3. Pedidos
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  data_pedido date not null default current_date,
  valor numeric(12, 2) not null default 0,
  descricao text,
  created_at timestamptz not null default now()
);

create index orders_client_id_idx on public.orders (client_id);

-- 4. Observações (histórico de notas por cliente)
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  conteudo text not null,
  created_at timestamptz not null default now()
);

create index client_notes_client_id_idx on public.client_notes (client_id);

-- 5. Fotos dos bonés (metadados; arquivo fica no Storage)
create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index order_photos_client_id_idx on public.order_photos (client_id);

-- 6. Metas mensais de vendas por consultor
create table public.metas_mensais (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles (id),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  valor_meta numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consultant_id, ano, mes)
);

-- 7. View com estatísticas agregadas por cliente (nº de pedidos, total
-- comprado, ticket médio, data do último pedido). security_invoker faz a view
-- rodar com as permissões de quem consulta, então a RLS de `orders` continua
-- valendo (um consultor não enxerga o agregado de clientes de outro).
create view public.client_stats
with (security_invoker = on) as
select
  c.id as client_id,
  c.historico_qtd_compras + count(o.id) as pedidos,
  c.historico_faturamento_total + coalesce(sum(o.valor), 0) as total_comprado,
  case
    when (c.historico_qtd_compras + count(o.id)) > 0
    then (c.historico_faturamento_total + coalesce(sum(o.valor), 0))
      / (c.historico_qtd_compras + count(o.id))
    else 0
  end as ticket_medio,
  greatest(c.historico_ultima_compra, max(o.data_pedido)) as ultimo_pedido
from public.clients c
left join public.orders o on o.client_id = c.id
group by c.id;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.client_notes enable row level security;
alter table public.order_photos enable row level security;
alter table public.metas_mensais enable row level security;

-- helper: papel do usuário logado
create function public.current_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- profiles: todo usuário autenticado pode ler os perfis (para exibir nome do
-- consultor responsável e o seletor de carteiras do admin); só o próprio dono
-- edita o próprio perfil.
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');

-- A policy acima só restringe QUAIS linhas podem ser editadas, não QUAIS
-- campos — sem uma trava extra, um consultor autenticado poderia rodar um
-- update na própria linha trocando role para 'admin'. Este trigger garante:
--   1. ninguém muda o PRÓPRIO role pelo app (nem um admin — evita se
--      auto-rebaixar e ficar trancado fora sem querer);
--   2. só quem já é admin pode mudar o role de OUTRA pessoa pelo app (usado
--      pela tela /admin de promover/rebaixar consultores).
-- Mudanças feitas pelo SQL Editor / Table Editor do Supabase (sem contexto de
-- usuário autenticado, auth.role() não é 'authenticated') continuam
-- permitidas — é o caminho para promover o primeiro admin do zero.
create function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' then
    if old.id = auth.uid() then
      new.role := old.role;
    elsif not exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

create trigger before_profile_update_protect_role
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- clients: consultor só vê/edita a própria carteira; admin vê/edita tudo.
create policy "clients_select_own_or_admin"
  on public.clients for select
  to authenticated
  using (consultant_id = auth.uid() or public.current_role() = 'admin');

create policy "clients_insert_own_or_admin"
  on public.clients for insert
  to authenticated
  with check (consultant_id = auth.uid() or public.current_role() = 'admin');

create policy "clients_update_own_or_admin"
  on public.clients for update
  to authenticated
  using (consultant_id = auth.uid() or public.current_role() = 'admin');

-- só admin apaga clientes (usado na "zona de perigo" de /importar, e em
-- qualquer exclusão individual futura).
create policy "clients_delete_admin_only"
  on public.clients for delete
  to authenticated
  using (public.current_role() = 'admin');

-- metas_mensais: consultor só vê/edita a própria meta; admin vê/edita a de todos.
create policy "metas_all_own_or_admin"
  on public.metas_mensais for all
  to authenticated
  using (consultant_id = auth.uid() or public.current_role() = 'admin')
  with check (consultant_id = auth.uid() or public.current_role() = 'admin');

-- orders / client_notes / order_photos: acesso segue o dono do cliente pai.
create policy "orders_all_own_or_admin"
  on public.orders for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = orders.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = orders.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "notes_all_own_or_admin"
  on public.client_notes for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "photos_all_own_or_admin"
  on public.order_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = order_photos.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = order_photos.client_id
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- ============================================================
-- Storage: bucket para as fotos dos bonés
-- ============================================================

insert into storage.buckets (id, name, public)
values ('client-photos', 'client-photos', false)
on conflict (id) do nothing;

-- Caminho esperado no bucket: {client_id}/{arquivo}. A policy confere que o
-- usuário logado é dono (ou admin) do cliente cujo id é o primeiro segmento
-- do caminho.
create policy "photos_storage_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-photos'
    and exists (
      select 1 from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "photos_storage_insert_own_or_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-photos'
    and exists (
      select 1 from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and (c.consultant_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- ============================================================
-- Storage: bucket para as fotos de perfil dos consultores
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Qualquer pessoa autenticada pode ver a foto de qualquer colega (não é dado
-- sensível). Caminho esperado: {profile_id}/{arquivo} — só o dono (ou admin)
-- pode enviar/substituir a própria foto.
create policy "avatars_storage_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_storage_insert_own_or_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role() = 'admin'
    )
  );

create policy "avatars_storage_update_own_or_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role() = 'admin'
    )
  );
