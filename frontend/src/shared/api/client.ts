import { env } from "@/shared/config/env";
import { avisarSessaoExpirada, getAccessToken, setAccessToken } from "@/shared/api/token";
import type { Sessao } from "@/shared/api/contracts";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** false nas rotas de autenticação: um 401 nelas não dispara a renovação. */
  renovarSessao?: boolean;
};

const MENSAGEM_PADRAO = "Não foi possível concluir a operação.";
const MENSAGEM_SEM_CONEXAO = "Sem conexão com o servidor. Confira a internet e tente de novo.";

let renovacaoEmAndamento: Promise<Sessao | null> | null = null;

/**
 * Pede um novo token de acesso pelo cookie de renovação e o guarda em memória.
 * Chamadas simultâneas compartilham a mesma requisição.
 */
export function renovarSessao(): Promise<Sessao | null> {
  renovacaoEmAndamento ??= fetch(`${env.apiUrl}/auth/refresh`, {
    method: "POST",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const sessao = (await response.json()) as Sessao;
      setAccessToken(sessao.access_token);
      return sessao;
    })
    .catch(() => null)
    .finally(() => {
      renovacaoEmAndamento = null;
    });
  return renovacaoEmAndamento;
}

async function enviar(path: string, options: RequestOptions): Promise<Response> {
  const { body, headers, renovarSessao: _ignorado, ...requestOptions } = options;
  const token = getAccessToken();
  try {
    return await fetch(`${env.apiUrl}${path}`, {
      credentials: "same-origin",
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(MENSAGEM_SEM_CONEXAO, 0);
  }
}

/**
 * Chama a API. Com 401, renova o token uma vez e repete a requisição (ADR 0001); se a
 * renovação falhar, avisa que a sessão expirou.
 */
export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await enviar(path, options);

  if (response.status === 401 && options.renovarSessao !== false) {
    const sessao = await renovarSessao();
    if (sessao) {
      response = await enviar(path, options);
    }
    if (response.status === 401) avisarSessaoExpirada();
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
    const detail = typeof payload?.detail === "string" ? payload.detail : MENSAGEM_PADRAO;
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
