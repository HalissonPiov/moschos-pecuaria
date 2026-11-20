import { describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "./client";
import { env } from "@/shared/config/env";

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
