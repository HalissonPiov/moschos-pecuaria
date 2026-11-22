import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const custos = "/fazenda/baixada/custos";

async function abrir(query = "") {
  const tela = renderRoute(`${custos}${query}`);
  await screen.findByRole("heading", { level: 1, name: /^custos$/i });
  return tela;
}

function linha(nome: RegExp) {
  return screen.getByRole("button", { name: nome });
}

describe("Custos — Lançamentos", () => {
  it("mostra situação, vencido há 2 dias com ícone e o autor", async () => {
    await abrir();

    const locacao = linha(/locação de pasto.*carlos andrade/i);
    const vencido = within(locacao).getByText("Vencido há 2 dias");
    expect(vencido.querySelector("svg")).not.toBeNull();
    expect(locacao).toHaveTextContent(/por joão batista/i);

    expect(within(linha(/vacina contra clostridiose/i)).getByText("A pagar · vence 25/11")).toBeInTheDocument();
    expect(within(linha(/sal mineral proteinado/i)).getByText("Pago")).toBeInTheDocument();
  });

  it("o detalhe mostra quem lançou, Estornar e Marcar como pago, nunca Excluir", async () => {
    const { user } = await abrir();

    await user.click(linha(/locação de pasto.*carlos andrade/i));
    const detalhe = await screen.findByRole("dialog", { name: /detalhe do lançamento/i });

    expect(within(detalhe).getByText(/lançado por joão batista em 06\/10\/2026/i)).toBeInTheDocument();
    expect(within(detalhe).getByRole("button", { name: /estornar/i })).toBeInTheDocument();
    expect(within(detalhe).getByRole("button", { name: /marcar como pago/i })).toBeInTheDocument();
    expect(within(detalhe).queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
  });

  it("marcar como pago registra o pagamento e oferece Desfazer", async () => {
    const { user } = await abrir("?lancamento=e3");

    const detalhe = await screen.findByRole("dialog", { name: /detalhe do lançamento/i });
    await user.click(within(detalhe).getByRole("button", { name: /marcar como pago/i }));

    const pagar = await screen.findByRole("dialog", { name: "Marcar como pago" });
    expect(within(pagar).getByLabelText("Data do pagamento")).toHaveValue("2026-11-20");
    await user.click(within(pagar).getByRole("button", { name: "Marcar como pago" }));

    expect(await screen.findByText(/pagamento registrado em 20\/11\/2026/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();
    expect(within(linha(/locação de pasto.*carlos andrade/i)).getByText("Pago")).toBeInTheDocument();
  });

  it("estornar pede confirmação e o lançamento só volta com Mostrar estornados", async () => {
    const { user } = await abrir("?lancamento=e1");

    const detalhe = await screen.findByRole("dialog", { name: /detalhe do lançamento/i });
    await user.click(within(detalhe).getByRole("button", { name: /estornar/i }));
    const confirmar = await screen.findByRole("dialog", { name: /estornar este lançamento\?/i });
    expect(confirmar).toHaveTextContent(/continua no histórico, marcado como estornado/i);
    await user.click(within(confirmar).getByRole("button", { name: /estornar/i }));

    expect(await screen.findByText(/lançamento estornado/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /sal mineral proteinado/i })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("checkbox", { name: /mostrar estornados/i }));
    expect(
      within(linha(/sal mineral proteinado/i)).getByText("Estornado em 20/11"),
    ).toBeInTheDocument();
  });

  it("Mostrar estornados revela os estornados com o selo", async () => {
    const { user } = await abrir();

    expect(screen.queryByRole("button", { name: /reparo da cerca/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /mostrar estornados/i }));

    expect(within(linha(/reparo da cerca/i)).getByText("Estornado em 10/09")).toBeInTheDocument();
  });

  it("uma nota com lançamentos não pode ser excluída e explica o porquê", async () => {
    await abrir("?aba=notas&nota=n1");

    const nota = await screen.findByRole("dialog", { name: /nota da compra/i });
    expect(nota).toHaveTextContent(/estorne os lançamentos antes de excluir a nota/i);
    expect(within(nota).queryByRole("button", { name: /excluir nota/i })).not.toBeInTheDocument();
  });

  it("uma nota sem lançamentos ativos pode ser excluída", async () => {
    const { user } = await abrir("?aba=notas&nota=n4");

    const nota = await screen.findByRole("dialog", { name: /nota da compra/i });
    await user.click(within(nota).getByRole("button", { name: /excluir nota/i }));
    const confirmar = await screen.findByRole("dialog", { name: /excluir esta nota\?/i });
    await user.click(within(confirmar).getByRole("button", { name: /excluir nota/i }));

    expect(await screen.findByText("Nota excluída.")).toBeInTheDocument();
  });
});

describe("Custos — A confirmar", () => {
  it("confirmar um previsto pede valor e data efetivos e avisa a próxima data", async () => {
    const { user } = await abrir("?aba=confirmar");

    const racao = screen.getByRole("heading", { name: "Ração mensal" }).closest("article")!;
    await user.click(within(racao as HTMLElement).getByRole("button", { name: "Confirmar" }));

    const modal = await screen.findByRole("dialog", { name: /confirmar ração mensal/i });
    const valor = within(modal).getByLabelText("Valor efetivo");
    expect(valor).toHaveValue("4.680,00");
    expect(within(modal).getByLabelText("Data efetiva")).toHaveValue("2026-11-05");
    await user.clear(valor);
    await user.type(valor, "4.700,00");
    await user.click(within(modal).getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText("Confirmado. A próxima ração ficou prevista para 05/12/2026."),
    ).toBeInTheDocument();
  });

  it("pular desta vez pede confirmação, deixa a recorrência ativa e oferece Desfazer", async () => {
    const { user } = await abrir("?aba=confirmar");

    const racao = screen.getByRole("heading", { name: "Ração mensal" }).closest("article")!;
    await user.click(within(racao as HTMLElement).getByRole("button", { name: /pular desta vez/i }));

    const modal = await screen.findByRole("dialog", { name: /pular desta vez\?/i });
    expect(modal).toHaveTextContent(/a próxima continua prevista para 05\/12\/2026/i);
    await user.click(within(modal).getByRole("button", { name: /pular desta vez/i }));

    expect(
      await screen.findByText(/pulada\. a próxima ficou prevista para 05\/12\/2026/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();

    // A próxima ocorrência continua ativa, ainda recorrente.
    const ativa = screen.getByRole("heading", { name: "Ração mensal" }).closest("article")!;
    expect(ativa).toHaveTextContent("05/12");
    expect(ativa).toHaveTextContent(/recorrente · mensal/i);

    await user.click(screen.getByRole("checkbox", { name: /mostrar pulados/i }));
    expect(screen.getByText("Pulado")).toBeInTheDocument();
  });

  it("Desfazer volta o previsto pulado", async () => {
    const { user } = await abrir("?aba=confirmar");

    const racao = screen.getByRole("heading", { name: "Ração mensal" }).closest("article")!;
    await user.click(within(racao as HTMLElement).getByRole("button", { name: /pular desta vez/i }));
    const modal = await screen.findByRole("dialog", { name: /pular desta vez\?/i });
    await user.click(within(modal).getByRole("button", { name: /pular desta vez/i }));
    await user.click(await screen.findByRole("button", { name: "Desfazer" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Ração mensal" }).closest("article")).toHaveTextContent(
        "05/11",
      ),
    );
    expect(screen.getAllByRole("heading", { name: "Ração mensal" })).toHaveLength(1);
  });

  it("um previsto avulso mostra Cancelar previsto, não ações de recorrência", async () => {
    const { user } = await abrir("?aba=confirmar");

    const curral = screen.getByRole("heading", { name: "Manutenção do curral" }).closest("article")!;
    const card = within(curral as HTMLElement);
    expect(card.getByText(/previsto avulso/i)).toBeInTheDocument();
    expect(card.queryByRole("button", { name: /pular desta vez/i })).not.toBeInTheDocument();

    await user.click(card.getByRole("button", { name: /cancelar previsto/i }));
    const modal = await screen.findByRole("dialog", { name: /cancelar previsto\?/i });
    await user.click(within(modal).getByRole("button", { name: /cancelar previsto/i }));

    expect(await screen.findByText("Previsto cancelado.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Manutenção do curral" })).not.toBeInTheDocument(),
    );
  });

  it("encerrar a recorrência explica o efeito e marca Encerrada em", async () => {
    const { user } = await abrir("?aba=confirmar");

    const sal = screen.getByRole("heading", { name: "Sal mineral proteinado" }).closest("article")!;
    await user.click(within(sal as HTMLElement).getByRole("button", { name: /encerrar recorrência/i }));

    const modal = await screen.findByRole("dialog", { name: /encerrar recorrência\?/i });
    expect(modal).toHaveTextContent(/não serão criados novos previstos/i);
    expect(modal).toHaveTextContent(/o que já foi confirmado continua no custo/i);
    await user.click(within(modal).getByRole("button", { name: /encerrar recorrência/i }));

    expect(await screen.findByText("Recorrência encerrada em 20/11/2026.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /mostrar pulados/i }));
    const encerrada = screen.getByRole("heading", { name: "Sal mineral proteinado" }).closest("article")!;
    expect(within(encerrada as HTMLElement).getByText(/encerrada em 20\/11\/2026/i)).toBeInTheDocument();
    expect(
      within(encerrada as HTMLElement).queryByRole("button", { name: "Confirmar" }),
    ).not.toBeInTheDocument();
  });
});

describe("Custos — A pagar", () => {
  it("agrupa em Vencidos, até 7 dias e Mais tarde, com o total", async () => {
    await abrir("?aba=pagar");

    expect(screen.getByText("Total a pagar").parentElement).toHaveTextContent("6.186,45");
    const vencidos = screen.getByRole("region", { name: "Vencidos" });
    const semana = screen.getByRole("region", { name: "Vencem em até 7 dias" });
    const depois = screen.getByRole("region", { name: "Mais tarde" });

    expect(within(vencidos).getByText("Locação de pasto")).toBeInTheDocument();
    expect(within(vencidos).getByText("Vencido há 2 dias")).toBeInTheDocument();
    expect(within(semana).getByText("Vacina contra clostridiose")).toBeInTheDocument();
    expect(within(depois).getByText("Ração de crescimento 20%")).toBeInTheDocument();
  });

  it("marcar como pago tira a conta do grupo", async () => {
    const { user } = await abrir("?aba=pagar");

    const vencidos = screen.getByRole("region", { name: "Vencidos" });
    await user.click(within(vencidos).getByRole("button", { name: /marcar como pago/i }));
    const modal = await screen.findByRole("dialog", { name: "Marcar como pago" });
    await user.click(within(modal).getByRole("button", { name: "Marcar como pago" }));

    expect(await screen.findByText(/pagamento registrado em 20\/11\/2026/i)).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Vencidos" })).getByText("Nenhuma conta neste grupo."),
    ).toBeInTheDocument();
    expect(screen.getByText("Total a pagar").parentElement).toHaveTextContent("2.936,45");
  });
});

describe("Custos — Projeção", () => {
  it("diferencia previsto e a pagar por texto, não só por cor", async () => {
    await abrir("?aba=projecao");

    expect(screen.getByText("Conta a pagar (preenchido)")).toBeInTheDocument();
    expect(screen.getByText("Previsto (hachurado)")).toBeInTheDocument();
    expect(
      screen.getByText(/nov\/2026: a pagar r\$ 4\.036,45; previsto r\$ 4\.680,00\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recorrências ativas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Previstos avulsos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contas a pagar" })).toBeInTheDocument();
  });
});

describe("Custos — Categorias", () => {
  it("as categorias padrão têm o selo Sugerida", async () => {
    await abrir("?aba=categorias");

    expect(screen.getAllByText("Sugerida")).toHaveLength(6);
  });

  it("uma categoria com lançamentos é inativada, não excluída", async () => {
    const { user } = await abrir("?aba=categorias");

    const racao = screen.getByText("42 lançamentos · Ativa").closest("div")!;
    expect(within(racao as HTMLElement).queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    await user.click(within(racao as HTMLElement).getByRole("button", { name: "Inativar" }));

    const modal = await screen.findByRole("dialog", { name: "Inativar Ração?" });
    expect(modal).toHaveTextContent(/os 42 lançamentos continuam com esta categoria/i);
    await user.click(within(modal).getByRole("button", { name: "Inativar" }));

    expect(await screen.findByText("Categoria Ração inativada.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("42 lançamentos · Ativa")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("checkbox", { name: /mostrar inativas/i }));
    expect(screen.getByText(/42 lançamentos · inativa/i)).toBeInTheDocument();
  });

  it("uma categoria sem lançamentos pode ser excluída", async () => {
    const { user } = await abrir("?aba=categorias");

    const manutencao = screen.getByText("0 lançamentos · Ativa").closest("div")!;
    await user.click(within(manutencao as HTMLElement).getByRole("button", { name: "Excluir" }));

    const modal = await screen.findByRole("dialog", { name: "Excluir Manutenção?" });
    expect(modal).toHaveTextContent(/não tem lançamentos/i);
    await user.click(within(modal).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Categoria Manutenção excluída.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /mostrar inativas/i }));
    expect(screen.queryByText(/0 lançamentos/)).not.toBeInTheDocument();
  });
});
