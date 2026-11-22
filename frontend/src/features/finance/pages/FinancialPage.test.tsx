import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const base = "/fazenda/baixada";
const painelSafra = `${base}/rebanho/lote-safra-24/painel`;

async function abrirPainel(path = painelSafra) {
  const view = renderRoute(path);
  await screen.findByRole("heading", { level: 1, name: "Quanto custa e quanto pode sobrar" });
  return view;
}

describe("Painel financeiro do lote", () => {
  it("mostra custo acumulado, alocado, do saldo, custo por @ e equilíbrio em R$ / @", async () => {
    await abrirPainel();
    const numeros = screen.getByRole("region", { name: "Números principais" });

    expect(numeros).toHaveTextContent("Custo acumuladoR$ 84.251,84");
    expect(numeros).toHaveTextContent("Aquisição de R$ 41.800,00 + custos confirmados");
    expect(numeros).toHaveTextContent("Custo já alocado às vendasR$ 15.117,63");
    expect(numeros).toHaveTextContent("Custo do saldoR$ 69.134,21");
    expect(numeros).toHaveTextContent("Custo por @ do saldoR$ 132,48 / @");
    expect(numeros).toHaveTextContent("Ponto de equilíbrio do saldoR$ 132,48 / @");
    // O equilíbrio é sempre por arroba, nunca por animal.
    expect(document.body).not.toHaveTextContent(/por animal/i);
  });

  it("mostra a conta das arrobas do saldo e recalcula com o peso médio digitado", async () => {
    const { user } = await abrirPainel();

    expect(
      screen.getByRole("heading", { name: "31 animais × 505 kg × 50% ÷ 15 = 521,83 @" }),
    ).toBeInTheDocument();

    const peso = screen.getByLabelText("Peso médio atual estimado (kg)");
    await user.clear(peso);
    expect(peso).toHaveAccessibleDescription(/informe o peso médio em kg/i);

    await user.type(peso, "520");
    expect(
      screen.getByRole("heading", { name: "31 animais × 520 kg × 50% ÷ 15 = 537,33 @" }),
    ).toBeInTheDocument();
  });

  it("a linha \"Aquisição dos animais\" compõe o custo e leva às notas de origem", async () => {
    const { user, router, pathname } = await abrirPainel();

    const aquisicao = screen.getByRole("button", { name: /^Aquisição dos animais: R\$ 41\.800,00/ });
    await user.click(aquisicao);

    expect(pathname()).toBe(`${base}/custos`);
    expect(router.state.location.search).toBe("?aba=notas&lote=lote-safra-24");
  });

  it("o gráfico compara o custo por @ com a cotação de referência de Minas Gerais", async () => {
    await abrirPainel();

    expect(screen.getByText("Cotação de referência · Minas Gerais")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /cotação de referência de Minas Gerais em R\$ 318,00 \/ @/ }),
    ).toBeInTheDocument();
    const comparativo = screen.getByRole("region", {
      name: "Comparativo com a cotação de referência",
    });
    expect(comparativo).toHaveTextContent("R$ 185,52 / @ acima");
  });

  it("\"Simular venda\" abre o simulador do mesmo lote", async () => {
    const { user, router } = await abrirPainel();

    await user.click(screen.getByRole("button", { name: "Simular venda" }));

    expect(router.state.location.search).toBe("?aba=simulador&lote=lote-safra-24");
    expect(await screen.findByText("Simulação: não altera nenhum dado.")).toBeInTheDocument();
  });

  it("lote vendido fica travado e sem custo por @ nem ações de venda", async () => {
    await abrirPainel(`${base}/rebanho/lote-recria-23/painel`);

    expect(screen.getByText(/lote vendido\. os dados estão travados/i)).toBeInTheDocument();
    expect(screen.getByText(/não tem animais no saldo/i)).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Números principais" })).getAllByText("—").length,
    ).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("button", { name: "Registrar venda" })).not.toBeInTheDocument();
  });
});
