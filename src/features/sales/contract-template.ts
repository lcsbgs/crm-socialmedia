// Modelo de contrato com variáveis {{chave}}. O espaço pode trocar o texto em Comercial > Modelo.
export const defaultContractTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE GESTÃO DE REDES SOCIAIS

Contratante: {{cliente}}{{cliente_documento}}, representada por {{contato}}.
Contratada: {{estudio}}.

1. Objeto
A Contratada fará a gestão das redes sociais da Contratante conforme o pacote {{pacote}}: {{itens}}.

2. Valor e pagamento
Valor mensal de {{valor}}, com vencimento todo dia {{vencimento}}, por boleto ou Pix.

3. Prazo
Vigência de {{duracao}} meses, de {{inicio}} a {{fim}}, renovável por acordo entre as partes.

4. Aprovação
Os conteúdos são enviados para aprovação pelo link do Pauta. Cada post tem até {{rodadas}} rodadas de ajuste. Pedidos fora do pacote são orçados como escopo extra.

5. Rescisão
Qualquer parte pode encerrar com aviso de 30 dias, sem multa, pagando os serviços já prestados.

Data: {{data}}.`;

export function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}
