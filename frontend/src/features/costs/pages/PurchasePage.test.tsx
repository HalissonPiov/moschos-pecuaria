import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const compra = "/fazenda/baixada/custos/nova-compra";

async function abrir(query = "") {
  const tela = renderRoute(`${compra}${query}`);
  await screen.findByRole("heading", { level: 1, name: /registrar compra/i });
  return tela;
}

describe("Registrar compra — início", () => {
  it("avisa que só os membros da propriedade veem as fotos e marca a leitura automática como em breve", async () => {
    await abrir();

    expect(
      screen.getByText(/só os membros desta propriedade veem as fotos das notas/i),
    ).toBeInTheDocument();
    const leitura = screen.getByRole("button", { name: /ler nota automaticamente/i });
    expect(leitura).toBeDisabled();
    expect(leitura).toHaveTextContent(/em breve/i);
  });

  it("lançar sem nota vai direto para os dados da compra", async () => {
    const { user, router } = await abrir();

    await user.click(screen.getByRole("button", { name: /lançar sem nota/i }));

    expect(await screen.findByRole("heading", { name: /dados da compra/i })).toBeInTheDocument();
    expect(router.state.location.search).toContain("origem=sem-nota");
    expect(screen.getByText(/etapa 1 de 3/i)).toBeInTheDocument();
  });
});

describe("Registrar compra — dados da nota", () => {
  it("o número da nota é opcional", async () => {
    const { user } = await abrir("?origem=camera&etapa=2");

    const numero = screen.getByLabelText("Número da nota (opcional)");
    expect(numero).toHaveValue("");
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("heading", { name: /itens e custos/i })).toBeInTheDocument();
  });

  it("data futura mostra o erro e o atalho Lançar previsto", async () => {
    const { user, router } = await abrir("?origem=camera&etapa=2");

    fireEvent.change(screen.getByLabelText("Data da compra"), {
      target: { value: "2026-11-25" },
    });

    expect(
      screen.getByText(/a compra ainda não aconteceu\? use lançar previsto/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Data da compra")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /lançar previsto/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/fazenda/baixada/custos"));
    expect(router.state.location.search).toContain("novo=previsto");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("Pago com data de pagamento futura mostra o erro e não avança (T1)", async () => {
    const { user } = await abrir("?origem=camera&etapa=2");
    const pagamento = screen.getByLabelText("Data do pagamento");

    fireEvent.change(pagamento, { target: { value: "2026-11-25" } });
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(pagamento).toHaveAccessibleDescription(/a data do pagamento não pode ser futura/i);
    expect(screen.queryByRole("heading", { name: /itens e custos/i })).not.toBeInTheDocument();

    fireEvent.change(pagamento, { target: { value: "2026-11-20" } });
    expect(pagamento).toHaveAttribute("aria-invalid", "false");
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByRole("heading", { name: /itens e custos/i })).toBeInTheDocument();
  });

  it("Pago pede a data do pagamento e A pagar exige o vencimento", async () => {
    const { user } = await abrir("?origem=camera&etapa=2");

    const grupo = screen.getByRole("radiogroup", { name: /como foi pago\?/i });
    expect(within(grupo).getByRole("radio", { name: "Pago" })).toBeChecked();
    expect(screen.getByLabelText("Data do pagamento")).toHaveValue("2026-11-05");

    await user.click(within(grupo).getByRole("radio", { name: "A pagar" }));
    expect(screen.queryByLabelText("Data do pagamento")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getByText("Informe o vencimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Vencimento")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("heading", { name: /itens e custos/i })).not.toBeInTheDocument();
  });
});

describe("Registrar compra — itens e custos", () => {
  it("o destino lista só registros ativos e explica que o custo fica no lote", async () => {
    await abrir("?origem=sem-nota&etapa=3");

    const destino = screen.getByRole("combobox", { name: "Destino" });
    const opcoes = within(destino)
      .getAllByRole("option")
      .map((opcao) => opcao.textContent);
    expect(opcoes).toEqual(["Lote Safra 24", "Lote Bezerros Sul", "Boi 047"]);
    expect(opcoes).not.toContain("Lote Recria 23");
    expect(opcoes).not.toContain("Lote Descarte 22");
    expect(screen.getByText(/o custo fica no lote/i)).toBeInTheDocument();
  });

  it("a categoria sugerida (RN15) não vem marcada e, sem escolha, aparece o erro", async () => {
    const { user } = await abrir("?origem=sem-nota&etapa=3");

    expect(
      screen.getByText(/sugerido pela última compra de agropecuária ponte nova/i),
    ).toBeInTheDocument();
    const categorias = screen.getByRole("group", { name: "Categoria" });
    for (const botao of within(categorias).getAllByRole("button")) {
      expect(botao).not.toHaveAttribute("aria-pressed", "true");
    }

    await user.click(screen.getByRole("button", { name: /revisar compra/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha a categoria");

    await user.click(screen.getByRole("button", { name: /usar sugestão/i }));
    expect(within(categorias).getByRole("button", { name: "Suplemento" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("Escolha a categoria")).not.toBeInTheDocument();
  });

  it("a periodicidade tem Semestral e Anual e não tem Personalizada", async () => {
    const { user } = await abrir("?origem=sem-nota&etapa=3");

    await user.click(screen.getByRole("checkbox", { name: /compra recorrente/i }));

    const periodicidade = screen.getByRole("combobox", { name: "Periodicidade" });
    const opcoes = within(periodicidade)
      .getAllByRole("option")
      .map((opcao) => opcao.textContent);
    expect(opcoes).toContain("Semestral");
    expect(opcoes).toContain("Anual");
    expect(opcoes).not.toContain("Personalizada");
    expect(screen.getByLabelText("Próxima data prevista")).toHaveValue("2026-12-05");
  });

  it("o boleto aparece desativado com Em breve", async () => {
    await abrir("?origem=sem-nota&etapa=3");

    const boleto = screen.getByRole("button", { name: /boleto desta nota/i });
    expect(boleto).toBeDisabled();
    expect(boleto).toHaveTextContent(/em breve/i);
  });
});

describe("Registrar compra — revisão", () => {
  it("mostra A pagar · vence ... em cada lançamento", async () => {
    const { user } = await abrir("?origem=sem-nota&etapa=2");

    await user.click(screen.getByRole("radio", { name: "A pagar" }));
    fireEvent.change(screen.getByLabelText("Vencimento"), { target: { value: "2026-12-10" } });
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await screen.findByRole("heading", { name: /itens e custos/i });
    await user.click(screen.getByRole("button", { name: "Suplemento" }));
    await user.click(screen.getByRole("button", { name: /revisar compra/i }));

    expect(await screen.findByRole("heading", { name: /revise e salve/i })).toBeInTheDocument();
    expect(screen.getByText(/lançamento 1/i)).toBeInTheDocument();
    expect(screen.getByText("A pagar · vence 10/12/2026")).toBeInTheDocument();
  });

  it("salvar leva à confirmação com o custo no destino", async () => {
    const { user } = await abrir("?origem=sem-nota&etapa=3");

    await user.click(screen.getByRole("button", { name: "Ração" }));
    await user.click(screen.getByRole("button", { name: /revisar compra/i }));
    expect(await screen.findByText("Pago em 05/11/2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /salvar compra/i }));

    expect(await screen.findByRole("heading", { name: /tudo certo por aqui/i })).toBeInTheDocument();
    expect(screen.getByText(/já entrou em lote safra 24/i)).toBeInTheDocument();
  });
});

describe("Registrar compra — conexão e rascunho", () => {
  it("?conexao=off mostra a faixa sem conexão e não deixa salvar", async () => {
    const { user } = await abrir("?origem=sem-nota&etapa=3&conexao=off");

    expect(
      screen.getByText(/sem conexão\. nada do que você preencheu foi perdido\./i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ração" }));
    await user.click(screen.getByRole("button", { name: /revisar compra/i }));
    await user.click(await screen.findByRole("button", { name: /salvar compra/i }));

    expect(
      await screen.findByText(/a compra fica guardada no aparelho/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /tudo certo por aqui/i })).not.toBeInTheDocument();
  });

  it("?foto=falha com origem=camera oferece Enviar a foto de novo", async () => {
    const { user } = await abrir("?origem=camera&etapa=2&foto=falha");

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(/não conseguimos enviar a foto/i);

    await user.click(within(alerta).getByRole("button", { name: /enviar a foto de novo/i }));

    expect(await screen.findByText("Foto enviada.")).toBeInTheDocument();
    expect(screen.queryByText(/não conseguimos enviar a foto/i)).not.toBeInTheDocument();
  });

  it("?foto=falha sem foto (sem nota) não mostra a falha de envio", async () => {
    await abrir("?origem=sem-nota&etapa=2&foto=falha");

    expect(screen.queryByRole("button", { name: /enviar a foto de novo/i })).not.toBeInTheDocument();
  });

  it("?rascunho=1 pergunta se quer continuar e retoma nos itens", async () => {
    const { user } = await abrir("?rascunho=1");

    expect(screen.getByText(/continuar a compra iniciada hoje às 09:42\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^continuar$/i }));

    expect(await screen.findByRole("heading", { name: /itens e custos/i })).toBeInTheDocument();
    expect(screen.getByText("Compra retomada de onde você parou.")).toBeInTheDocument();
    expect(screen.queryByText(/continuar a compra iniciada/i)).not.toBeInTheDocument();
  });
});
