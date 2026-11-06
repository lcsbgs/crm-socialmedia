// Saudação variável do topo da Em pauta hoje: sorteada a cada visita,
// conforme o período do dia e o dia da semana, às vezes com um fato do dia,
// sem repetir a última mostrada.

export type GreetingFact = { key: string; text: string };

export type GreetingInput = {
  name: string;
  /** Hora local (0 a 23) e dia da semana (0 = domingo). */
  hour: number;
  weekday: number;
  /** Fatos reais do dia (ex.: "a Padaria aprovou 2 posts ontem"). */
  facts?: GreetingFact[];
  /** Chave da última saudação mostrada, para não repetir. */
  last?: string | null;
  /** Número entre 0 e 1 (injetável nos testes). */
  random?: number;
};

export type Greeting = { key: string; text: string };

export function greetingOptions({ name, hour, weekday, facts = [] }: GreetingInput): Greeting[] {
  const n = name.trim().split(/\s+/)[0] || "você";
  const options: Greeting[] = [{ key: "ola", text: `Olá, ${n}!` }];

  if (hour >= 5 && hour < 12) {
    options.push({ key: "bomdia-cafe", text: `Bom dia, ${n}. Café na mão?` });
    options.push({ key: "bomdia", text: `Bom dia, ${n}!` });
  } else if (hour >= 12 && hour < 18) {
    options.push({ key: "boatarde", text: `Boa tarde, ${n}.` });
    options.push({ key: "boatarde-foco", text: `Boa tarde, ${n}. Bora fechar o que dá hoje?` });
  } else {
    options.push({ key: "boanoite", text: `Boa noite, ${n}. Só uma olhada rápida?` });
  }

  if (weekday === 1) options.push({ key: "segunda", text: `Segunda, ${n}. Semana nova, pauta nova.` });
  if (weekday === 5) options.push({ key: "sexta", text: `Sextou, ${n}. Bora fechar a semana.` });
  if (weekday === 0 || weekday === 6) options.push({ key: "fds", text: `Trabalhando no fim de semana, ${n}? Vai rapidinho.` });

  for (const f of facts) options.push({ key: `fato:${f.key}`, text: `${n}, ${f.text}` });
  return options;
}

export function pickGreeting(input: GreetingInput): Greeting {
  const all = greetingOptions(input);
  const pool = all.length > 1 ? all.filter((g) => g.key !== input.last) : all;
  const r = input.random ?? Math.random();
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
}
