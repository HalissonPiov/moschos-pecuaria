import { apiClient, renovarSessao } from "@/shared/api/client";
import { setAccessToken } from "@/shared/api/token";
import type { CadastroDeConta, Credenciais, Sessao, Usuario } from "@/shared/api/contracts";

/** Adaptador de autenticação (ADR 0001). O token de acesso fica só em memória. */

function abrir(sessao: Sessao): Usuario {
  setAccessToken(sessao.access_token);
  return sessao.usuario;
}

export async function criarConta(dados: CadastroDeConta): Promise<Usuario> {
  const sessao = await apiClient<Sessao>("/auth/register", {
    method: "POST",
    body: dados,
    renovarSessao: false,
  });
  return abrir(sessao);
}

export async function entrar(credenciais: Credenciais): Promise<Usuario> {
  const sessao = await apiClient<Sessao>("/auth/login", {
    method: "POST",
    body: credenciais,
    renovarSessao: false,
  });
  return abrir(sessao);
}

/** Retoma a sessão pelo cookie de renovação, ao abrir ou recarregar o app. */
export async function retomarSessao(): Promise<Usuario | null> {
  const sessao = await renovarSessao();
  return sessao ? sessao.usuario : null;
}

export async function sair(): Promise<void> {
  try {
    await apiClient<void>("/auth/logout", { method: "POST", renovarSessao: false });
  } finally {
    setAccessToken(null);
  }
}
