// Link wa.me com mensagem pronta. Telefones brasileiros sem DDI ganham 55.
export function whatsappLink(phone: string | null | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}
