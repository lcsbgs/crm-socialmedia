import { brand } from "@/config/brand";

// Painel violeta do login: o que é o Pauta, na voz do produto.
export function AuthHero() {
  return (
    <section
      aria-label={`Sobre o ${brand.name}`}
      className="flex flex-[1_1_520px] flex-col gap-10 bg-accent px-6 py-10 text-white sm:px-14 sm:py-12"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white font-display text-[22px] font-extrabold text-accent">
          P
        </span>
        <span className="font-display text-2xl">{brand.name}</span>
      </div>
      <div className="mt-auto flex flex-col gap-5">
        <span className="text-[17px] text-[#E4DEFF]">Olá!</span>
        <p className="max-w-[560px] font-display text-3xl leading-[1.2] sm:text-[46px]">
          Em pauta hoje:{" "}
          <span className="mx-0.5 my-1 inline-flex rounded-full bg-white px-4 text-accent-tonal-ink">suas reuniões</span>,{" "}
          <span className="mx-0.5 my-1 inline-flex rounded-full bg-today px-4 text-today-ink">os posts do dia</span> e
          quem está esperando você.
        </p>
        <p className="max-w-[460px] text-[17px] leading-normal text-[#E4DEFF]">{brand.description}</p>
        <ul className="flex flex-wrap gap-2.5 text-sm">
          {["Publica no Instagram e Facebook", "Canva integrado", "Aprovação pelo WhatsApp"].map((t) => (
            <li key={t} className="rounded-full bg-white/16 px-3 py-1.5">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
