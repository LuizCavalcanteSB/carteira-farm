import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { formatDateOnly } from "@/lib/date";
import { ClientTabs } from "./client-tabs";
import { BirthdayEditor } from "./birthday-editor";
import { ClientInfoEditor } from "./client-info-editor";
import { ConsultorEditor } from "./consultor-editor";
import { PrazoEntregaEditor } from "./prazo-entrega-editor";
import type { ClientStatus, PerfilComprador, Porte } from "@/lib/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospeccao: "Prospecção",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const [
    { data: viewerProfile },
    { data: stats },
    { data: notes },
    { data: orders },
    { data: photos },
    { data: links },
    { data: consultor },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("client_stats").select("*").eq("client_id", id).single(),
    supabase
      .from("client_notes")
      .select("*, author:profiles(nome)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("client_id", id)
      .order("data_pedido", { ascending: false }),
    supabase
      .from("order_photos")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_links")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("nome").eq("id", client.consultant_id).single(),
  ]);

  const isAdmin = viewerProfile?.role === "admin";

  const consultores = isAdmin
    ? (await supabase.from("profiles").select("id, nome").order("nome")).data ?? []
    : [];

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("client-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);
      return { ...photo, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {client.nome}
          </h1>
          <p className="text-sm text-zinc-400">
            {client.razao_social && client.razao_social !== client.nome
              ? `${client.razao_social} · `
              : ""}
            {client.cnpj
              ? `CNPJ ${formatCnpj(client.cnpj)}`
              : `CPF ${formatCpf(client.cpf)}`}
          </p>
        </div>
        <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-chumbo">
          {STATUS_LABEL[client.status as ClientStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pedidos" value={String(stats?.pedidos ?? 0)} />
        <StatCard
          label="Total comprado"
          value={formatCurrency(stats?.total_comprado ?? 0)}
        />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(stats?.ticket_medio ?? 0)}
        />
        <StatCard
          label="Último pedido"
          value={
            stats?.ultimo_pedido
              ? formatDateOnly(stats.ultimo_pedido)
              : "—"
          }
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 text-sm shadow-sm">
        <ClientInfoEditor
          clientId={client.id}
          info={{
            contato: client.contato,
            comprador: client.comprador,
            telefone: client.telefone,
            email: client.email,
            segmento: client.segmento,
            cidade: client.cidade,
            endereco: client.endereco,
            situacao_cadastral: client.situacao_cadastral,
            perfil_comprador: client.perfil_comprador as PerfilComprador | null,
            porte: client.porte as Porte | null,
          }}
        />

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Primeira compra"
            value={
              client.historico_primeira_compra
                ? formatDateOnly(client.historico_primeira_compra)
                : null
            }
          />
          {isAdmin ? (
            <ConsultorEditor
              clientId={client.id}
              consultantId={client.consultant_id}
              consultores={consultores}
            />
          ) : (
            <Field label="Consultor responsável" value={consultor?.nome} />
          )}
          <BirthdayEditor
            clientId={client.id}
            aniversarioEmpresa={client.aniversario_empresa}
          />
          <PrazoEntregaEditor
            clientId={client.id}
            prazoEntrega={client.prazo_entrega}
          />
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
        <ClientTabs
          clientId={client.id}
          notes={notes ?? []}
          orders={orders ?? []}
          photos={photosWithUrls}
          links={links ?? []}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
      <p className="text-xs uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-400">{label}</p>
      <p className="mt-0.5 text-white">{value || "—"}</p>
    </div>
  );
}
