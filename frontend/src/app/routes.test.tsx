import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const base = "/fazenda/baixada";

// Cada rota do app abre com o título esperado e sem erro no console.
const telas: Array<[string, RegExp]> = [
  ["/entrar", /gestão que\s*fortalece o campo/i],
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

  it("a raiz e rotas desconhecidas levam ao login", async () => {
    const raiz = renderRoute("/");
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });
    expect(raiz.pathname()).toBe("/entrar");
    raiz.unmount();

    const desconhecida = renderRoute("/qualquer/coisa");
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });
    expect(desconhecida.pathname()).toBe("/entrar");
  });

  it("propriedade inexistente não mostra dados de outra fazenda", async () => {
    renderRoute("/fazenda/inexistente/resumo");

    expect(
      await screen.findByRole("heading", { name: /propriedade não encontrada/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/fazenda da baixada/i)).not.toBeInTheDocument();
  });
});
