import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, renovarSessao } from "./client";
import { getAccessToken, onSessaoExpirada, setAccessToken } from "./token";
import { env } from "@/shared/config/env";

afterEach(() => setAccessToken(null));

const sessao = (token: string) => ({
  access_token: token,
  token_type: "bearer",
  expires_in: 900,
  usuario: { id: 1, nome: "João Batista", email: "joao@exemplo.com" },
});

/** Cabeçalho Authorization enviado na chamada de número `indice`. */
function autorizacao(fetchMock: ReturnType<typeof vi.spyOn>, indice: number) {
  const init = fetchMock.mock.calls[indice][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("apiClient", () => {
  it("monta a URL a partir da base da API e envia o corpo como JSON", async () => {
    const fetchMock = mockFetch(Response.json({ status: "ok" }));

    const resultado = await apiClient<{ status: string }>("/health", {
      method: "POST",
      body: { nome: "Lote 1" },
    });

    expect(resultado).toEqual({ status: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${env.apiUrl}/health`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ nome: "Lote 1" }));
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("não envia corpo quando nenhum é informado", async () => {
    const fetchMock = mockFetch(Response.json([]));

    await apiClient("/properties");

    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
  });

  it("devolve undefined para 204 sem tentar ler o corpo", async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiClient("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("lança ApiError com a mensagem e o status enviados pela API", async () => {
    mockFetch(Response.json({ detail: "Registro não encontrado." }, { status: 404 }));

    const erro = await apiClient("/properties/9").catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 404, message: "Registro não encontrado." });
  });

  it("usa uma mensagem padrão quando a resposta de erro não é JSON", async () => {
    mockFetch(new Response("Bad Gateway", { status: 502 }));

    await expect(apiClient("/health")).rejects.toMatchObject({
      status: 502,
      message: "Não foi possível concluir a operação.",
    });
  });
});

describe("apiClient · sessão (ADR 0001)", () => {
  it("usa a API pelo caminho relativo do proxy, por padrão", () => {
    expect(env.apiUrl).toBe("/api/v1");
  });

  it("envia o token de acesso guardado em memória", async () => {
    const fetchMock = mockFetch(Response.json([]));
    setAccessToken("token-a");

    await apiClient("/properties");

    expect(autorizacao(fetchMock, 0)).toBe("Bearer token-a");
    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe("same-origin");
  });

  it("com 401, renova o token uma vez e repete a requisição", async () => {
    setAccessToken("vencido");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ detail: "Sua sessão expirou." }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(sessao("novo")))
      .mockResolvedValueOnce(Response.json([{ id: 1 }]));

    await expect(apiClient("/properties")).resolves.toEqual([{ id: 1 }]);

    expect(fetchMock.mock.calls[1][0]).toBe(`${env.apiUrl}/auth/refresh`);
    expect(autorizacao(fetchMock, 2)).toBe("Bearer novo");
    expect(getAccessToken()).toBe("novo");
  });

  it("se a renovação falhar, avisa que a sessão expirou e lança 401", async () => {
    setAccessToken("vencido");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ detail: "Sua sessão expirou. Entre novamente." }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ detail: "Sua sessão expirou." }, { status: 401 }));
    const expirou = vi.fn();
    const parar = onSessaoExpirada(expirou);

    await expect(apiClient("/properties")).rejects.toMatchObject({ status: 401 });

    expect(expirou).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    parar();
  });

  it("nas rotas de autenticação, 401 não tenta renovar", async () => {
    const fetchMock = mockFetch(
      Response.json({ detail: "E-mail ou senha incorretos." }, { status: 401 }),
    );

    await expect(
      apiClient("/auth/login", { method: "POST", body: {}, renovarSessao: false }),
    ).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("chamadas simultâneas compartilham uma só renovação", async () => {
    const fetchMock = mockFetch(Response.json(sessao("unico")));

    const [a, b] = await Promise.all([renovarSessao(), renovarSessao()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a?.access_token).toBe("unico");
    expect(b).toBe(a);
  });

  it("sem conexão, lança ApiError com status 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiClient("/properties")).rejects.toMatchObject({
      status: 0,
      message: expect.stringMatching(/sem conexão/i),
    });
  });

  it("erro de validação (detail em lista) vira a mensagem padrão", async () => {
    mockFetch(Response.json({ detail: [{ msg: "field required" }] }, { status: 422 }));

    await expect(apiClient("/properties", { method: "POST", body: {} })).rejects.toMatchObject({
      status: 422,
      message: "Não foi possível concluir a operação.",
    });
  });
});

