import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const pillarSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao pilar").max(40),
  pct: z.number().int().min(0).max(100),
});
export type Pillar = z.infer<typeof pillarSchema>;

export const strategySchema = z.object({
  objetivo: text(300),
  publico: text(1000),
  objetivos: z.array(z.object({ texto: z.string().trim().min(1).max(200), prazo: z.string().trim().max(40).default("") })).max(10).default([]),
  pilares: z.array(pillarSchema).max(8).default([]),
  formatos: z
    .array(z.object({ formato: z.string().trim().min(1).max(40), frequencia: z.string().trim().max(60).default("") }))
    .max(10)
    .default([]),
  decisoes: z
    .array(z.object({ data: z.string().trim().max(10), texto: z.string().trim().min(1).max(300), origem: z.string().max(40).default("manual") }))
    .max(50)
    .default([]),
});
export type StrategyInput = z.infer<typeof strategySchema>;

export const brandKitSchema = z.object({
  cores: z
    .array(z.object({ hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor em formato #RRGGBB"), nome: z.string().trim().max(30).default("") }))
    .max(12)
    .default([]),
  fontes: text(200),
  tom: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  evitar: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  observacoes: text(2000),
});
export type BrandKitInput = z.infer<typeof brandKitSchema>;

export const checklistItemSchema = z.object({
  key: z.string().max(40),
  label: z.string().trim().min(1).max(80),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// Checklist padrão de onboarding do cliente. Itens com "auto" são marcados pelo sistema
// quando o dado existe (ex.: briefing respondido).
export const defaultChecklist: (ChecklistItem & { auto?: "briefing" | "kit" | "instagram" | "drive" | "kickoff" | "pacote" })[] = [
  { key: "contrato", label: "Contrato assinado", done: false },
  { key: "pacote", label: "Pacote definido", done: false, auto: "pacote" },
  { key: "briefing", label: "Briefing respondido", done: false, auto: "briefing" },
  { key: "kit", label: "Kit da marca", done: false, auto: "kit" },
  { key: "instagram", label: "Conectar Instagram", done: false, auto: "instagram" },
  { key: "drive", label: "Pasta no Drive", done: false, auto: "drive" },
  { key: "kickoff", label: "Reunião de kickoff", done: false, auto: "kickoff" },
];

export const briefingQuestions = [
  { key: "negocio", label: "Conte sobre o negócio: o que vende, para quem, há quanto tempo.", long: true },
  { key: "objetivo", label: "O que você quer que as redes tragam nos próximos 3 meses?", long: true },
  { key: "publico", label: "Quem é o cliente ideal? Idade, onde mora, o que busca.", long: true },
  { key: "diferencial", label: "Por que escolhem você e não o concorrente?", long: true },
  { key: "tom", label: "Como a marca fala? Três palavras.", long: false },
  { key: "evitar", label: "Palavras, temas ou estilos que não podem aparecer.", long: false },
  { key: "referencias", label: "Perfis que você admira (links ou @).", long: false },
  { key: "aprovacao", label: "Quem aprova os posts e qual o melhor WhatsApp?", long: false },
] as const;
