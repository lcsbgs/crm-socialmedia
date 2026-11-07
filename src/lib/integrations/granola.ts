import "server-only";

// Granola como cliente MCP do servidor hospedado (Streamable HTTP, JSON-RPC 2.0), OAuth por pessoa.
// TODO(oauth-setup): GRANOLA_MCP_URL e o fluxo OAuth com descoberta (RFC 8414) e registro dinâmico.
export type GranolaNote = { id: string; titulo: string; data: string; texto: string };

export interface GranolaAdapter {
  simulated: boolean;
  findNoteFor(token: string, meeting: { titulo: string; data: string }): Promise<GranolaNote | null>;
}

async function mcpCall<T>(url: string, token: string, method: string, params: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`Granola respondeu ${res.status}`);
  const text = await res.text();
  // Resposta pode vir como SSE ("data: {...}") ou JSON puro.
  const payload = text.startsWith("event:") || text.startsWith("data:") ? text.split("\n").find((l) => l.startsWith("data:"))!.slice(5) : text;
  const json = JSON.parse(payload) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

export function realGranola(url = process.env.GRANOLA_MCP_URL ?? "https://mcp.granola.ai/mcp"): GranolaAdapter {
  return {
    simulated: false,
    async findNoteFor(token, meeting) {
      const day = meeting.data.slice(0, 10);
      const found = await mcpCall<{ content?: { type: string; text?: string }[] }>(url, token, "tools/call", {
        name: "search_meetings",
        arguments: { keywords: [meeting.titulo], from_date: day, to_date: day },
      });
      const idMatch = found.content?.map((c) => c.text ?? "").join("\n").match(/[0-9a-f]{8}-[0-9a-f-]{27}/);
      if (!idMatch) return null;
      const note = await mcpCall<{ content?: { type: string; text?: string }[] }>(url, token, "tools/call", {
        name: "get_meetings",
        arguments: { meeting_ids: [idMatch[0]] },
      });
      return { id: idMatch[0], titulo: meeting.titulo, data: meeting.data, texto: note.content?.map((c) => c.text ?? "").join("\n") ?? "" };
    },
  };
}

export const mockGranola: GranolaAdapter = {
  simulated: true,
  async findNoteFor(_token, meeting) {
    return {
      id: `demo-${meeting.data}`,
      titulo: meeting.titulo,
      data: meeting.data,
      texto: [
        `Reunião: ${meeting.titulo}`,
        "- Cliente gostou dos carrosséis do mês passado",
        "- Ficou combinado foco em encomendas de fim de ano",
        "- Decidido manter 3 posts por semana",
        "- enviar fotos novas da vitrine até sexta",
        "- preparar calendário de dezembro",
        "- marcar sessão de fotos com a equipe",
      ].join("\n"),
    };
  },
};
