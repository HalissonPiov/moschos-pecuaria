import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "@/shared/api/token";

// Este arquivo testa o adaptador de verdade (os testes de tela usam o falso de setup.ts).
vi.unmock("@/features/auth/api");
const { criarConta, entrar, retomarSessao, sair } = await import("./api");

const usuario = { id: 7, nome: "Ana Batista", email: "ana@exemplo.com" };
const sessao = { access_token: "acesso-7", token_type: "bearer", expires_in: 900, usuario };

afterEach(() => setAccessToken(null));

describe("adaptador de autenticação", () => {
  it("entrar envia as credenciais, guarda o token em memória e devolve o usuário", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(sessao));

    await expect(entrar({ email: "ana@exemplo.com", senha: "pasto-verde-2026" })).resolves.toEqual(
      usuario,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/login");
    expect(init?.body).toBe(JSON.stringify({ email: "ana@exemplo.com", senha: "pasto-verde-2026" }));
    expect(getAccessToken()).toBe("acesso-7");
  });

  it("criar conta usa /auth/register e já abre a sessão", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(sessao, { status: 201 }));

    await criarConta({ nome: "Ana Batista", email: "ana@exemplo.com", senha: "pasto-verde-2026" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/register");
    expect(getAccessToken()).toBe("acesso-7");
  });

  it("retomar a sessão usa o cookie de renovação; sem cookie, não há sessão", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(sessao))
      .mockResolvedValueOnce(Response.json({ detail: "Sua sessão expirou." }, { status: 401 }));

    await expect(retomarSessao()).resolves.toEqual(usuario);
    await expect(retomarSessao()).resolves.toBeNull();
  });

  it("sair apaga o token mesmo sem conexão", async () => {
    setAccessToken("acesso-7");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(sair()).rejects.toMatchObject({ status: 0 });
    expect(getAccessToken()).toBeNull();
  });
});
