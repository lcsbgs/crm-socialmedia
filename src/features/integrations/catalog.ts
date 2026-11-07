// Integrações exibidas em Ajustes > Integrações.
export type IntegrationId = "meta" | "instagram" | "google" | "canva" | "granola" | "asaas" | "assinatura";

export const integrations: {
  id: IntegrationId;
  nome: string;
  descricao: string;
  quem: "admin" | "pessoa";
}[] = [
  { id: "meta", nome: "Facebook e Instagram", descricao: "Publica nas páginas e no Instagram ligado a elas (Facebook Login for Business).", quem: "admin" },
  { id: "instagram", nome: "Instagram sem página", descricao: "Para contas profissionais do Instagram que não têm página no Facebook.", quem: "admin" },
  { id: "google", nome: "Google Agenda e Drive", descricao: "Reuniões do dia, criar reunião com Meet e pasta do cliente no Drive.", quem: "pessoa" },
  { id: "canva", nome: "Canva", descricao: "Cria a arte no Canva e traz de volta como nova versão do post.", quem: "pessoa" },
  { id: "granola", nome: "Granola", descricao: "Traz a ata da reunião e transforma em próximos passos.", quem: "pessoa" },
  { id: "asaas", nome: "Asaas", descricao: "Boleto, Pix e nota fiscal automáticos.", quem: "admin" },
  { id: "assinatura", nome: "Clicksign ou ZapSign", descricao: "Assinatura eletrônica dos contratos.", quem: "admin" },
];

export const integrationScopes: Record<IntegrationId, string[]> = {
  meta: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "instagram_manage_insights", "business_management"],
  instagram: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"],
  google: ["calendar.events", "drive.file"],
  canva: ["design:content:read", "design:content:write", "design:meta:read", "asset:read", "asset:write"],
  granola: ["meetings:read"],
  asaas: [],
  assinatura: [],
};
