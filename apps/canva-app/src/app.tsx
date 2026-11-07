import { Button, FormField, Rows, Text, TextInput } from "@canva/app-ui-kit";
import { requestExport } from "@canva/design";
import { useState } from "react";

declare const PAUTA_URL: string;

// Botão "Enviar para o Pauta": exporta o design em PNG e entrega ao post como nova versão.
export function App() {
  const [appCode, setAppCode] = useState("");
  const [postCode, setPostCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await requestExport({ acceptedFileTypes: ["png"] });
      if (result.status !== "completed") {
        setStatus("Envio cancelado.");
        return;
      }
      const res = await fetch(`${PAUTA_URL}/api/integrations/canva/app-upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appCode, postId: postCode.trim(), urls: result.exportBlobs.map((b) => b.url), title: result.title }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setStatus(data.ok ? "Pronto. A arte entrou no Pauta como nova versão." : (data.error ?? "Não foi possível enviar."));
    } catch {
      setStatus("Não foi possível falar com o Pauta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Rows spacing="2u">
      <Text>Mande este design para um post do Pauta.</Text>
      <FormField label="Código do app (Ajustes, Integrações)" control={(p) => <TextInput {...p} value={appCode} onChange={setAppCode} />} />
      <FormField label="Código do post (editor do post)" control={(p) => <TextInput {...p} value={postCode} onChange={setPostCode} />} />
      <Button variant="primary" onClick={send} loading={busy} disabled={!appCode || !postCode} stretch>
        Enviar para o Pauta
      </Button>
      {status ? <Text>{status}</Text> : null}
    </Rows>
  );
}
