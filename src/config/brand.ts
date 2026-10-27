// Fonte única do nome do produto. Nunca escreva o nome direto em componentes,
// e-mails ou metadados: importe daqui.
export const brand = {
  name: "CRM Social Media",
  shortName: "CRM Social",
  tagline: "O back office de quem cuida das redes dos clientes",
  description:
    "Clientes, rotina recorrente, entregas, aprovações, reuniões, escopo e cobranças em um só lugar.",
  domain: "crmsocialmedia.app",
  supportEmail: "contato@crmsocialmedia.app",
} as const;

export type Brand = typeof brand;
