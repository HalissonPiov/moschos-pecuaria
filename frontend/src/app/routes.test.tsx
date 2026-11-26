import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderRoute } from "@/test/renderRoute";
import { ApiError } from "@/shared/api/client";
import { obterPropriedade } from "@/features/properties/api";

const base = "/fazenda/baixada";

// Cada rota do app abre com o título esperado e sem erro no console.
const telas: Array<[string, RegExp]> = [
  ["/propriedades", /minhas propriedades/i],
  ["/convite/valido", /convidou você/i],
  [`${base}/resumo`, /bom dia, joão/i],
  [`${base}/rebanho`, /^rebanho$/i],
  [`${base}/rebanho/novo`, /cadastrar no rebanho/i],
  [`${base}/rebanho/lote-safra-24`, /lote safra 24/i],
  [`${base}/rebanho/lote-safra-24/editar`, /lote safra 24/i],
  [`${base}/rebanho/lote-safra-24/painel`, /quanto custa e quanto pode sobrar/i],
  [`${base}/custos`, /^custos$/i],
  [`${base}/custos/nova-compra`, /registrar compra/i],
  [`${base}/vendas`, /^vendas$/i],
  [`${base}/mercado`, /cotações da arroba/i],
  [`${base}/configuracoes`, /^configurações$/i],
];

describe("rotas", () => {
  it.each(telas)("%s abre a tela certa", async (path, titulo) => {
    const erros = vi.spyOn(console, "error");
    renderRoute(path);

    expect(await screen.findByRole("heading", { level: 1, name: titulo })).toBeInTheDocument();
    expect(erros).not.toHaveBeenCalled();
  });

  it("/entrar abre a tela de acesso para quem está sem sessão", async () => {
    renderRoute("/entrar", { usuario: null });

    expect(
      await screen.findByRole("heading", { level: 1, name: /gestão que\s*fortalece o campo/i }),
    ).toBeInTheDocument();
  });

  it.each(["/propriedades", "/fazenda/baixada/resumo", "/fazenda/baixada/configuracoes"])(
    "%s sem sessão leva ao login",
    async (path) => {
      const { pathname } = renderRoute(path, { usuario: null });

      expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
      expect(pathname()).toBe("/entrar");
    },
  );

  it("/fazenda/:id sem a tela abre o Resumo", async () => {
    const { pathname } = renderRoute("/fazenda/baixada");

    expect(await screen.findByRole("heading", { level: 1, name: /bom dia, joão/i })).toBeInTheDocument();
    expect(pathname()).toBe("/fazenda/baixada/resumo");
  });

  it("a raiz e rotas desconhecidas levam ao login", async () => {
    const raiz = renderRoute("/", { usuario: null });
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });
    expect(raiz.pathname()).toBe("/entrar");
    raiz.unmount();

    const desconhecida = renderRoute("/qualquer/coisa", { usuario: null });
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });
    expect(desconhecida.pathname()).toBe("/entrar");
  });

  it("propriedade inexistente ou alheia (404 da API) não mostra dados de outra fazenda", async () => {
    const { user, pathname } = renderRoute("/fazenda/inexistente/resumo");

    expect(
      await screen.findByRole("heading", { level: 1, name: /propriedade não encontrada/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fazenda da baixada/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver minhas propriedades" }));
    expect(pathname()).toBe("/propriedades");
  });

  it("falha de rede ao abrir a propriedade oferece tentar de novo", async () => {
    vi.mocked(obterPropriedade).mockRejectedValueOnce(new ApiError("Sem conexão.", 0));
    const { user } = renderRoute("/fazenda/baixada/resumo");

    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { level: 1, name: /bom dia, joão/i })).toBeInTheDocument();
  });
});
