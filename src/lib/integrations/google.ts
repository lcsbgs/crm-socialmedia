import "server-only";

// Google Agenda e Drive. Escopos: calendar.events e drive.file (ver docs/oauth-setup.md).
export type CalendarEvent = {
  id: string;
  titulo: string;
  inicio: string; // ISO
  fim: string;
  convidados: string[];
  meetLink: string | null;
};

export interface GoogleAdapter {
  simulated: boolean;
  listEvents(token: string, fromISO: string, toISO: string): Promise<CalendarEvent[]>;
  createEvent(token: string, e: { titulo: string; inicio: string; fim: string; convidados: string[] }): Promise<{ id: string; meetLink: string | null }>;
  createFolder(token: string, nome: string): Promise<{ id: string; url: string }>;
}

export const realGoogle: GoogleAdapter = {
  simulated: false,
  async listEvents(token, from, to) {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", from);
    url.searchParams.set("timeMax", to);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Google Agenda respondeu ${res.status}`);
    const data = (await res.json()) as {
      items?: { id: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: { email: string }[]; hangoutLink?: string }[];
    };
    return (data.items ?? [])
      .filter((e) => e.start?.dateTime)
      .map((e) => ({
        id: e.id,
        titulo: e.summary ?? "Reunião",
        inicio: e.start!.dateTime!,
        fim: e.end?.dateTime ?? e.start!.dateTime!,
        convidados: (e.attendees ?? []).map((a) => a.email.toLowerCase()),
        meetLink: e.hangoutLink ?? null,
      }));
  },
  async createEvent(token, e) {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: e.titulo,
        start: { dateTime: e.inicio },
        end: { dateTime: e.fim },
        attendees: e.convidados.map((email) => ({ email })),
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      }),
    });
    if (!res.ok) throw new Error(`Google Agenda respondeu ${res.status}`);
    const data = (await res.json()) as { id: string; hangoutLink?: string };
    return { id: data.id, meetLink: data.hangoutLink ?? null };
  },
  async createFolder(token, nome) {
    const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name: nome, mimeType: "application/vnd.google-apps.folder" }),
    });
    if (!res.ok) throw new Error(`Google Drive respondeu ${res.status}`);
    const data = (await res.json()) as { id: string; webViewLink: string };
    return { id: data.id, url: data.webViewLink };
  },
};

// Demonstração: eventos de exemplo coerentes com os contatos dos clientes.
export function mockGoogle(contacts: { email: string; cliente: string }[]): GoogleAdapter {
  return {
    simulated: true,
    async listEvents(_token, from) {
      const day = from.slice(0, 10);
      const at = (h: number, m = 0) => new Date(`${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-03:00`).toISOString();
      const withEmail = contacts.filter((c) => c.email);
      const evs: CalendarEvent[] = withEmail.slice(0, 2).map((c, i) => ({
        id: `demo-${day}-${i}`,
        titulo: i === 0 ? `Alinhamento com ${c.cliente}` : `Kickoff, ${c.cliente}`,
        inicio: at(i === 0 ? 10 : 14, i === 0 ? 0 : 30),
        fim: at(i === 0 ? 10 : 15, i === 0 ? 45 : 15),
        convidados: [c.email],
        meetLink: "https://meet.google.com/abc-defg-hij",
      }));
      evs.push({ id: `demo-${day}-interno`, titulo: "Planejamento interno", inicio: at(17), fim: at(17, 30), convidados: [], meetLink: null });
      return evs;
    },
    async createEvent() {
      return { id: `demo-${Date.now()}`, meetLink: `https://meet.google.com/demo-${Math.random().toString(36).slice(2, 5)}-pauta` };
    },
    async createFolder(_token, nome) {
      const id = `demo-${Date.now()}`;
      return { id, url: `https://drive.google.com/drive/folders/${id}?nome=${encodeURIComponent(nome)}` };
    },
  };
}
