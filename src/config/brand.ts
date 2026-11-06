// Fonte única do nome do produto. Nunca escreva o nome direto em componentes,
// e-mails ou metadados: importe daqui.
export const brand = {
  name: "Pauta",
  shortName: "Pauta",
  tagline: "Você abre de manhã e sabe o que fazer",
  description:
    "Clientes, posts, aprovações e cobranças da sua agência num lugar só. Você abre de manhã e sabe o que fazer.",
  domain: "pauta.app",
  supportEmail: "contato@pauta.app",
} as const;

export type Brand = typeof brand;
