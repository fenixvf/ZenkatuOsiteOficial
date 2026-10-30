/** Cliente simples das rotas de avaliação em estrelas (`/api/avaliacoes`…). */

export type ResumoAvaliacao = {
  /** Média de 0 a 5 (0 quando ninguém votou). */
  media: number;
  total: number;
  /** Nota da conta logado, ou null se ainda não avaliou. */
  minha: number | null;
};

export type ObraMaisAvaliada = {
  id: number;
  titulo: string;
  slug: string;
  ano: number;
  status: string;
  capaUrl: string;
  bannerUrl: string;
  tipografiaUrl: string | null;
  media: number;
  total: number;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Falha na avaliação (HTTP ${res.status})`);
  return (await res.json()) as T;
}

/** Top obras mais bem avaliadas (máx. 5). */
export function fetchMaisAvaliadas(): Promise<ObraMaisAvaliada[]> {
  return requestJson<ObraMaisAvaliada[]>("/api/avaliacoes/mais-avaliadas");
}

/** Média, total e nota do usuário (quando informado) de uma obra. */
export function fetchAvaliacao(
  obraId: number,
  uid?: string,
): Promise<ResumoAvaliacao> {
  const query = uid ? `?uid=${encodeURIComponent(uid)}` : "";
  return requestJson<ResumoAvaliacao>(`/api/obras/${obraId}/avaliacao${query}`);
}

/** Envia (ou troca) a avaliação da conta na obra. */
export function enviarAvaliacao(
  obraId: number,
  uid: string,
  estrelas: number,
): Promise<ResumoAvaliacao> {
  return requestJson<ResumoAvaliacao>(`/api/obras/${obraId}/avaliacao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, estrelas }),
  });
}

/** Remove a avaliação da conta na obra. */
export function removerAvaliacao(
  obraId: number,
  uid: string,
): Promise<ResumoAvaliacao> {
  return requestJson<ResumoAvaliacao>(
    `/api/obras/${obraId}/avaliacao?uid=${encodeURIComponent(uid)}`,
    { method: "DELETE" },
  );
}
