import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const vendas = "/fazenda/baixada/vendas";
const editarVenda28 = `${vendas}?acao=editar&venda=venda-safra-24-2026-10-28&passo=2`;

/** Procura um elemento pelo texto completo (texto quebrado em várias tags). */
function textoCompleto(tag: string, pattern: RegExp) {
  return (_: string, element: Element | null) =>
    element?.tagName === tag && pattern.test(element.textContent?.replace(/\s+/g, " ") ?? "");
}

describe("Vendas · registrar venda", () => {
  it("vende em arrobas pelo peso vivo, sem campo de valor recebido digitado", async () => {
    renderRoute(`${vendas}?acao=registrar&passo=2`);
    const painel = await screen.findByRole("dialog", { name: "Registrar venda" });

    expect(within(painel).getByRole("radio", { name: "Pelo peso vivo" })).toBeChecked();
    expect(within(painel).getByLabelText("Peso vivo total")).toBeInTheDocument();
    expect(within(painel).getByLabelText("Rendimento de carcaça")).toHaveValue(50);
    expect(within(painel).getByLabelText("Preço por arroba")).toBeInTheDocument();
    expect(within(painel).queryByLabelText(/valor recebido/i)).not.toBeInTheDocument();
    expect(
      within(painel).getByText("O valor recebido é calculado pelas arrobas e pelo preço."),
    ).toBeInTheDocument();
  });

  it("aceita arrobas de carcaça do romaneio no lugar do peso vivo", async () => {
    const { user } = renderRoute(`${vendas}?acao=registrar&passo=2`);
    const painel = await screen.findByRole("dialog", { name: "Registrar venda" });

    await user.click(within(painel).getByRole("radio", { name: "Por arrobas de carcaça" }));

    expect(within(painel).getByRole("radio", { name: "Por arrobas de carcaça" })).toBeChecked();
    expect(within(painel).getByLabelText("Arrobas informadas pelo frigorífico")).toBeInTheDocument();
    expect(within(painel).queryByLabelText("Peso vivo total")).not.toBeInTheDocument();
    expect(within(painel).getByLabelText("Preço por arroba")).toBeInTheDocument();
  });

  it("mostra a conta das arrobas ao vivo e recalcula ao editar o rendimento", async () => {
    const { user } = renderRoute(editarVenda28);
    const painel = await screen.findByRole("dialog", { name: "Editar venda de 28/10/2026" });

    expect(
      within(painel).getByText(textoCompleto("P", /^3\.640 kg × 50% ÷ 15 = 121,33 @/)),
    ).toBeInTheDocument();

    const rendimento = within(painel).getByLabelText("Rendimento de carcaça");
    await user.clear(rendimento);
    await user.type(rendimento, "52");

    expect(
      within(painel).getByText(textoCompleto("P", /^3\.640 kg × 52% ÷ 15 = 126,19 @/)),
    ).toBeInTheDocument();
  });

  it("recusa rendimento fora de 1% a 100%", async () => {
    const { user } = renderRoute(editarVenda28);
    const painel = await screen.findByRole("dialog", { name: "Editar venda de 28/10/2026" });

    const rendimento = within(painel).getByLabelText("Rendimento de carcaça");
    await user.clear(rendimento);
    await user.type(rendimento, "120");

    expect(rendimento).toHaveAccessibleDescription(/o rendimento fica entre 1% e 100%/i);
  });

  it("resumo ao vivo da venda de 28/10 mostra o custo alocado e a origem de cada número", async () => {
    renderRoute(editarVenda28);
    const resumo = await screen.findByRole("complementary", { name: "Resumo ao vivo" });

    expect(resumo).toHaveTextContent("+ R$ 21.501,33");
    expect(resumo).toHaveTextContent("121,33 @");
    expect(resumo).toHaveTextContent("R$ 37.854,96");
    expect(resumo).toHaveTextContent("− R$ 15.117,63");
    expect(resumo).toHaveTextContent("R$ 134,79 / @");
    expect(within(resumo).getAllByText("do sistema").length).toBeGreaterThan(0);
    expect(within(resumo).getAllByText("digitado").length).toBeGreaterThan(0);
    expect(within(resumo).getAllByText("calculado").length).toBeGreaterThan(0);
    expect(within(resumo).getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("lista os compradores e avisa quando o nome é de um novo comprador", async () => {
    const { user } = renderRoute(`${vendas}?acao=registrar&passo=2`);
    const painel = await screen.findByRole("dialog", { name: "Registrar venda" });

    expect(
      within(painel).getByText(/compradores da propriedade: frigorífico união e josé carlos/i),
    ).toBeInTheDocument();

    await user.type(within(painel).getByLabelText("Comprador (opcional)"), "Pedro Lima");

    expect(within(painel).getByText(/novo comprador: “pedro lima”/i)).toBeInTheDocument();
  });

  it("registra as despesas como linhas que podem ser somadas e removidas", async () => {
    const { user } = renderRoute(editarVenda28);
    const painel = await screen.findByRole("dialog", { name: "Editar venda de 28/10/2026" });
    const despesas = within(painel).getByRole("group", { name: "Despesas da venda (opcional)" });

    expect(within(despesas).getByDisplayValue("Frete")).toBeInTheDocument();
    expect(within(despesas).getByDisplayValue("Taxas")).toBeInTheDocument();
    expect(despesas).toHaveTextContent("Total das despesasR$ 1.236,00");

    await user.click(within(despesas).getByRole("button", { name: "Adicionar despesa" }));
    expect(within(despesas).getAllByPlaceholderText("Frete, comissão, taxa")).toHaveLength(3);

    await user.click(within(despesas).getByRole("button", { name: "Remover Taxas" }));
    expect(within(despesas).queryByDisplayValue("Taxas")).not.toBeInTheDocument();
    expect(despesas).toHaveTextContent("Total das despesasR$ 850,00");
  });

  it("vender todo o saldo avisa que a venda encerra o lote", async () => {
    const { user } = renderRoute(`${vendas}?acao=registrar&lote=boi-047&passo=2`);
    const painel = await screen.findByRole("dialog", { name: "Registrar venda" });

    await user.click(within(painel).getByRole("button", { name: "Salvar venda" }));

    const aviso = await screen.findByRole("dialog", { name: "Esta venda encerra o lote" });
    expect(aviso).toHaveTextContent("Depois, custos e vendas ficam travados.");
    expect(within(aviso).getByRole("button", { name: "Confirmar e encerrar" })).toBeInTheDocument();
  });
});

describe("Vendas · registradas", () => {
  it("lista cada venda com arrobas, preço por @ e margem", async () => {
    renderRoute(vendas);

    const safra = await screen.findByRole("button", { name: /lote safra 24\s*28\/10\/2026/i });
    expect(safra).toHaveTextContent("121,33 @");
    expect(safra).toHaveTextContent("R$ 312,00 / @");
    expect(safra).toHaveTextContent("+ R$ 21.501,33");

    const recria = screen.getByRole("button", { name: /lote recria 23\s*03\/06\/2026/i });
    expect(recria).toHaveTextContent("335,67 @");
    expect(recria).toHaveTextContent("R$ 298,00 / @");
    expect(recria).toHaveTextContent("R$ 100.029,66");
  });

  it("estornar explica a volta dos 7 animais e a venda reaparece com \"Mostrar estornadas\"", async () => {
    const { user } = renderRoute(vendas);

    await user.click(await screen.findByRole("button", { name: /lote safra 24\s*28\/10\/2026/i }));
    const detalhe = await screen.findByRole("dialog", { name: "Venda de 28/10/2026" });
    await user.click(within(detalhe).getByRole("button", { name: "Estornar" }));

    const confirmar = await screen.findByRole("dialog", { name: "Estornar venda?" });
    expect(confirmar).toHaveTextContent("Os 7 animais voltam ao saldo do Lote Safra 24");
    await user.click(within(confirmar).getByRole("button", { name: "Estornar venda" }));

    expect(
      await screen.findByText("Venda estornada. Os 7 animais voltaram ao saldo do Lote Safra 24."),
    ).toBeInTheDocument();
    await user.click(within(detalhe).getByRole("button", { name: "Fechar" }));

    expect(
      screen.queryByRole("button", { name: /lote safra 24\s*28\/10\/2026/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Mostrar estornadas" }));
    const estornada = await screen.findByRole("button", { name: /lote safra 24\s*28\/10\/2026/i });
    expect(estornada).toHaveTextContent("Estornada");
  });

  it("venda de lote vendido fica travada e só pode ser corrigida com justificativa", async () => {
    renderRoute(`${vendas}?venda=venda-recria-23-2026-06-03`);

    const detalhe = await screen.findByRole("dialog", { name: "Venda de 03/06/2026" });
    expect(within(detalhe).getByRole("button", { name: "Corrigir com justificativa" })).toBeInTheDocument();
    expect(within(detalhe).queryByRole("button", { name: "Estornar" })).not.toBeInTheDocument();
    expect(within(detalhe).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });
});

describe("Vendas · simulador e ofertas", () => {
  it("simulador não salva nada e marca custos e previstos como estimados", async () => {
    renderRoute(`${vendas}?aba=simulador`);

    expect(await screen.findByText("Simulação: não altera nenhum dado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /salvar simulação/i })).not.toBeInTheDocument();
    expect(
      screen.getByText("Até 15/01/2027, o lote deve somar mais R$ 9.380,00 de previstos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("estimado · previstos não entram no custo confirmado"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("estimado").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByRole("button", { name: "Transformar em venda" })).toBeEnabled();
  });

  it("oferta de R$ 312 fica R$ 6,00 abaixo da referência e R$ 179,52 acima do equilíbrio", async () => {
    renderRoute(`${vendas}?aba=ofertas`);

    const oferta = (await screen.findByRole("heading", { name: "Frigorífico União" })).closest(
      "article",
    )!;
    expect(oferta).toHaveTextContent("R$ 312,00");
    expect(oferta).toHaveTextContent("− R$ 6,00 / @ abaixo da cotação de referência");
    expect(oferta).toHaveTextContent("+ R$ 179,52 / @ acima do seu ponto de equilíbrio");
  });

  it("\"Registrar venda com este preço\" abre a venda com o preço e o comprador da oferta", async () => {
    const { user } = renderRoute(`${vendas}?aba=ofertas`);

    const oferta = (await screen.findByRole("heading", { name: "Frigorífico União" })).closest(
      "article",
    )!;
    await user.click(
      within(oferta as HTMLElement).getByRole("button", { name: "Registrar venda com este preço" }),
    );

    const painel = await screen.findByRole("dialog", { name: "Registrar venda" });
    await user.click(within(painel).getByRole("button", { name: /continuar/i }));

    expect(within(painel).getByLabelText("Preço por arroba")).toHaveValue(312);
    expect(within(painel).getByLabelText("Comprador (opcional)")).toHaveValue("Frigorífico União");
  });
});
