import "server-only";

// Canva Connect API (OAuth por pessoa) com return navigation.
// TODO(oauth-setup): CANVA_CLIENT_ID e CANVA_CLIENT_SECRET; ativar return navigation no painel do Canva.
export interface CanvaAdapter {
  simulated: boolean;
  createDesign(token: string, input: { titulo: string; largura: number; altura: number; paginas: number }): Promise<{ designId: string; editUrl: string }>;
  exportDesign(token: string, designId: string): Promise<string[]>; // URLs dos PNGs
}

const API = "https://api.canva.com/rest/v1";

export const realCanva: CanvaAdapter = {
  simulated: false,
  async createDesign(token, input) {
    const res = await fetch(`${API}/designs`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ design_type: { type: "custom", width: input.largura, height: input.altura }, title: input.titulo }),
    });
    if (!res.ok) throw new Error(`Canva respondeu ${res.status}`);
    const data = (await res.json()) as { design: { id: string; urls: { edit_url: string } } };
    return { designId: data.design.id, editUrl: data.design.urls.edit_url };
  },
  async exportDesign(token, designId) {
    const start = await fetch(`${API}/exports`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
    });
    if (!start.ok) throw new Error(`Canva respondeu ${start.status}`);
    const { job } = (await start.json()) as { job: { id: string } };
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const st = await fetch(`${API}/exports/${job.id}`, { headers: { authorization: `Bearer ${token}` } });
      const data = (await st.json()) as { job: { status: string; urls?: string[] } };
      if (data.job.status === "success") return data.job.urls ?? [];
      if (data.job.status === "failed") throw new Error("O Canva não conseguiu exportar o design.");
    }
    throw new Error("A exportação do Canva demorou demais.");
  },
};

// Em demonstração o design é simulado dentro do Pauta (tela /integracoes/canva).
export const mockCanva: CanvaAdapter = {
  simulated: true,
  async createDesign(_t, input) {
    return { designId: `demo-${Date.now()}`, editUrl: `simulado://canva?titulo=${encodeURIComponent(input.titulo)}` };
  },
  async exportDesign() {
    return [];
  },
};
