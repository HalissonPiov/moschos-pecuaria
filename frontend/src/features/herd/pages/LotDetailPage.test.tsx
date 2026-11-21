import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const rebanho = "/fazenda/baixada/rebanho";

async function abrir(slug: string, nome: string, query = "") {
  const view = renderRoute(`${rebanho}/${slug}${query}`);
  await screen.findByRole("heading", { level: 1, name: nome });
  return view;
}

/** Valor de um dos quatro números do topo, sem espaços (ex.: "R$84.251,84"). */
function numero(rotulo: string) {
  const span = screen.getByText(rotulo, { selector: ".lot-numbers span" });
  return span.parentElement?.querySelector("strong")?.textContent?.replace(/\s/g, "");
}

function comparativo() {
  return within(screen.getByRole("region", { name: /comparativo com a cotação de referência/i }));
}

describe("Detalhe do lote: números e cotação", () => {
  it("Lote Safra 24 mostra os quatro números e a margem parcial", async () => {
    await abrir("lote-safra-24", "Lote Safra 24");

    expect(numero("Custo acumulado")).toBe("R$84.251,84");
    expect(numero("Custo por cabeça no saldo")).toBe("R$2.230,14");
    expect(numero("Custo por @ do saldo")).toBe("R$132,48/@");
    expect(numero("Margem líquida")).toBe("+R$21.501,33");
    expect(screen.getByText("parcial")).toBeInTheDocument();
    expect(screen.getByText("31", { selector: ".balance-tag strong" })).toBeInTheDocument();
    expect(screen.getByText(/de 38 animais/)).toBeInTheDocument();
  });

  it("Lote Safra 24 compara o equilíbrio com a cotação de referência", async () => {
    await abrir("lote-safra-24", "Lote Safra 24");

    const bloco = comparativo();
    expect(bloco.getByText("R$ 318,00 / @")).toBeInTheDocument();
    expect(bloco.getByText("Ponto de equilíbrio do saldo")).toBeInTheDocument();
    expect(bloco.getAllByText("R$ 132,48 / @")).toHaveLength(2);
    expect(bloco.getByText("R$ 185,52 / @ acima")).toBeInTheDocument();
    expect(
      screen.getByText(/R\$ 318,00 \/ @ · registrada em 06\/11\/2026.*fonte: Escritório local/),
    ).toBeInTheDocument();
  });

  it("Visão geral lista a aquisição dos animais no custo", async () => {
    await abrir("lote-safra-24", "Lote Safra 24");

    const linha = screen.getByText("Aquisição dos animais").closest("p");
    expect(linha).toHaveTextContent("Aquisição dos animaisR$ 41.800,00");
  });

  it("Lote Bezerros Sul: 22 de 22, em produção, com ação manual de status", async () => {
    await abrir("lote-bezerros-sul", "Lote Bezerros Sul");

    expect(screen.getByText(/de 22 animais/)).toBeInTheDocument();
    expect(numero("Custo acumulado")).toBe("R$32.707,84");
    expect(numero("Custo por @ do saldo")).toBe("R$185,84/@");
    expect(screen.getByText("Em produção")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Marcar como pronto para venda" }),
    ).toBeInTheDocument();
  });

  it("Boi 047 alerta que a cotação está abaixo do equilíbrio", async () => {
    await abrir("boi-047", "Boi 047");

    expect(numero("Custo acumulado")).toBe("R$5.412,80");
    expect(numero("Custo por @ do saldo")).toBe("R$345,50/@");
    const bloco = comparativo();
    expect(bloco.getByText("R$ 27,50 / @ abaixo")).toBeInTheDocument();
    expect(bloco.getByText(/vender agora dá prejuízo/i)).toBeInTheDocument();
  });

  it("Boi 047 permite trocar o status manualmente", async () => {
    const { user } = await abrir("boi-047", "Boi 047");

    await user.click(screen.getByRole("button", { name: "Voltar para em produção" }));

    expect(await screen.findByText("Animal voltou para em produção.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Marcar como pronto para venda" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["lote-safra-24", "Lote Safra 24", "Parcialmente vendido"],
    ["lote-recria-23", "Lote Recria 23", "Vendido"],
    ["lote-descarte-22", "Lote Descarte 22", "Encerrado"],
  ])("%s tem status automático, sem ação manual", async (slug, nome, status) => {
    await abrir(slug, nome);

    expect(screen.getByText(status, { selector: ".status-badge" })).toBeInTheDocument();
    expect(screen.getByText(/este status é automático/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pronto para venda|em produção/i })).not.toBeInTheDocument();
  });

  it("Lote Descarte 22 não tem comparativo com a cotação", async () => {
    await abrir("lote-descarte-22", "Lote Descarte 22");

    expect(screen.getByText(/sem animais no saldo: não há comparativo/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /comparativo com a cotação de referência/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Detalhe do lote: abas", () => {
  it("lote tem sete abas e a aba aberta vem da URL", async () => {
    await abrir("lote-safra-24", "Lote Safra 24", "?aba=custos");

    const abas = screen.getAllByRole("tab").map((aba) => aba.textContent);
    expect(abas).toEqual([
      "Visão geral",
      "Animais",
      "Custos",
      "Painel",
      "Vendas",
      "Movimentações",
      "Histórico",
    ]);
    expect(screen.getByRole("tab", { name: "Custos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("table", { name: "Custos por categoria" })).toBeInTheDocument();
  });

  it("trocar de aba grava a aba na URL", async () => {
    const { user, router } = await abrir("lote-safra-24", "Lote Safra 24");

    await user.click(screen.getByRole("tab", { name: "Painel" }));

    expect(new URLSearchParams(router.state.location.search).get("aba")).toBe("painel");
    expect(await screen.findByText("Você precisa receber pelo menos")).toBeInTheDocument();
  });

  it("animal individual não tem a aba Animais", async () => {
    await abrir("boi-047", "Boi 047", "?aba=animais");

    expect(screen.getAllByRole("tab")).toHaveLength(6);
    expect(screen.queryByRole("tab", { name: "Animais" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Visão geral" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Detalhe do lote: venda travada e inativação", () => {
  it("Lote Recria 23 vendido mostra a faixa de trava e não deixa editar", async () => {
    await abrir("lote-recria-23", "Lote Recria 23");

    expect(screen.getByText(/lote vendido\. os dados estão travados/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar lote/i })).not.toBeInTheDocument();
  });

  it("Corrigir com justificativa exige motivo com pelo menos 10 caracteres", async () => {
    const { user } = await abrir("lote-recria-23", "Lote Recria 23");

    await user.click(screen.getByRole("button", { name: "Corrigir com justificativa" }));
    const dialogo = within(await screen.findByRole("dialog", { name: "Corrigir com justificativa" }));
    await user.type(dialogo.getByLabelText("Novo valor"), "19 animais · R$ 100.500,00");
    const motivo = dialogo.getByRole("textbox", { name: /por que esta correção/i });
    await user.type(motivo, "Erro");
    await user.click(dialogo.getByRole("button", { name: "Salvar correção" }));

    expect(motivo).toHaveAccessibleDescription("Escreva pelo menos 10 caracteres para justificar.");
    expect(motivo).toBeInvalid();

    await user.type(motivo, " no romaneio do frigorífico");
    await user.click(dialogo.getByRole("button", { name: "Salvar correção" }));

    expect(await screen.findByText("Correção salva no Histórico do lote.")).toBeInTheDocument();
  });

  it("menu oferece Inativar (não Excluir) e preserva o histórico", async () => {
    const { user } = await abrir("lote-safra-24", "Lote Safra 24");

    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    const menu = within(screen.getByRole("menu"));
    expect(menu.queryByRole("menuitem", { name: /excluir/i })).not.toBeInTheDocument();
    await user.click(menu.getByRole("menuitem", { name: "Inativar lote" }));

    const dialogo = await screen.findByRole("dialog", { name: "Inativar Lote Safra 24?" });
    expect(dialogo).toHaveTextContent(/são preservados/i);
    expect(dialogo).not.toHaveTextContent(/serão apagados/i);
  });

  it("Lote Teste 21 inativo abre com aviso e opção de reativar", async () => {
    await abrir("lote-teste-21", "Lote Teste 21");

    expect(screen.getByText("Lote inativo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reativar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar lote/i })).not.toBeInTheDocument();
  });
});

describe("Detalhe do lote: aba Animais", () => {
  it("lista os animais #01 a #38 e conta os que têm dados", async () => {
    await abrir("lote-safra-24", "Lote Safra 24", "?aba=animais");

    expect(
      screen.getByRole("heading", { name: "12 de 31 animais com dados individuais" }),
    ).toBeInTheDocument();
    const tabela = within(screen.getByRole("table", { name: "Animais do Lote Safra 24" }));
    expect(tabela.getByText("#01")).toBeInTheDocument();
    expect(tabela.getByText("#38")).toBeInTheDocument();
    expect(tabela.getAllByRole("row")).toHaveLength(39);
  });

  it("busca por nome ou brinco filtra a lista", async () => {
    const { user, router } = await abrir("lote-safra-24", "Lote Safra 24", "?aba=animais");

    await user.type(screen.getByRole("textbox", { name: "Buscar por nome ou brinco" }), "471");

    expect(new URLSearchParams(router.state.location.search).get("buscaAnimal")).toBe("471");
    const tabela = within(screen.getByRole("table", { name: "Animais do Lote Safra 24" }));
    expect(tabela.getAllByRole("row")).toHaveLength(2);
    expect(tabela.getByText("Fortuna")).toBeInTheDocument();
  });

  it("brinco repetido mostra erro no campo", async () => {
    const { user } = await abrir("lote-safra-24", "Lote Safra 24", "?aba=animais&animal=01");

    const dialogo = within(await screen.findByRole("dialog", { name: "#01 · Estrela" }));
    const brinco = dialogo.getByLabelText("Brinco (opcional)");
    await user.clear(brinco);
    await user.type(brinco, "471");

    expect(brinco).toHaveAccessibleDescription(/brinco 471 já está em uso pelo animal #02/i);

    await user.clear(brinco);
    await user.type(brinco, "0047");
    expect(brinco).toHaveAccessibleDescription(/já está em uso pelo boi 047/i);
  });

  it("animal vendido abre somente leitura", async () => {
    await abrir("lote-safra-24", "Lote Safra 24", "?aba=animais&animal=32");

    const dialogo = within(await screen.findByRole("dialog", { name: /^#32/ }));
    expect(dialogo.getByText("Somente leitura")).toBeInTheDocument();
    expect(dialogo.getByText("Vendido em 28/10/2026 para Frigorífico União.")).toBeInTheDocument();
    expect(dialogo.getByLabelText("Brinco (opcional)")).toBeDisabled();
    expect(dialogo.queryByRole("button", { name: "Registrar pesagem" })).not.toBeInTheDocument();
    expect(dialogo.queryByRole("button", { name: "Salvar dados do animal" })).not.toBeInTheDocument();
  });

  it("pesagens do animal aparecem e uma nova pode ser registrada", async () => {
    const { user } = await abrir("lote-safra-24", "Lote Safra 24", "?aba=animais&animal=01");

    const detalhe = within(await screen.findByRole("dialog", { name: "#01 · Estrela" }));
    const pesagens = within(detalhe.getByRole("region", { name: "Pesagens" }));
    expect(pesagens.getByText("05/11/2026")).toBeInTheDocument();
    expect(pesagens.getByText("15/02/2026")).toBeInTheDocument();
    expect(pesagens.getByText("472 kg", { selector: ".weighing-list strong" })).toBeInTheDocument();

    await user.click(pesagens.getByRole("button", { name: "Registrar pesagem" }));
    const modal = within(await screen.findByRole("dialog", { name: "Registrar pesagem" }));
    await user.click(modal.getByRole("button", { name: "Registrar pesagem" }));
    expect(modal.getByLabelText("Peso")).toHaveAccessibleDescription(
      "Informe um peso maior que zero, em kg.",
    );

    await user.type(modal.getByLabelText("Peso"), "490");
    await user.click(modal.getByRole("button", { name: "Registrar pesagem" }));

    expect(
      await screen.findByText("Pesagem registrada. O peso atual foi atualizado."),
    ).toBeInTheDocument();
    expect(pesagens.getByText("20/11/2026")).toBeInTheDocument();
    expect(pesagens.getByText("490 kg", { selector: ".weight-current strong" })).toBeInTheDocument();
  });
});

describe("Detalhe do lote: aba Movimentações", () => {
  it("baixa maior que o saldo mostra erro e não é registrada", async () => {
    const { user } = await abrir("lote-bezerros-sul", "Lote Bezerros Sul", "?aba=movimentacoes");

    await user.click(screen.getByRole("button", { name: /baixa de animais/i }));
    const dialogo = within(await screen.findByRole("dialog", { name: "Baixa de animais" }));
    const quantidade = dialogo.getByLabelText("Quantidade");
    await user.clear(quantidade);
    await user.type(quantidade, "23");

    expect(quantidade).toHaveAccessibleDescription("O saldo é de 22 animais.");
    await user.click(dialogo.getByRole("button", { name: "Registrar baixa" }));
    expect(screen.getByRole("dialog", { name: "Baixa de animais" })).toBeInTheDocument();
    expect(screen.queryByText(/baixa registrada/i)).not.toBeInTheDocument();
  });

  it("baixa dentro do saldo entra na lista de movimentações", async () => {
    const { user } = await abrir("lote-bezerros-sul", "Lote Bezerros Sul", "?aba=movimentacoes");

    await user.click(screen.getByRole("button", { name: /baixa de animais/i }));
    const dialogo = within(await screen.findByRole("dialog", { name: "Baixa de animais" }));
    const quantidade = dialogo.getByLabelText("Quantidade");
    await user.clear(quantidade);
    await user.type(quantidade, "2");
    expect(dialogo.getByText("#01, #02")).toBeInTheDocument();
    await user.click(dialogo.getByRole("button", { name: "Registrar baixa" }));

    expect(await screen.findByText(/baixa registrada\. o custo continua no lote/i)).toBeInTheDocument();
    expect(screen.getByText("Baixa por morte")).toBeInTheDocument();
    expect(screen.getByText("− 2")).toBeInTheDocument();
  });

  it("no lote com dados individuais é preciso escolher exatamente quais animais saíram", async () => {
    const { user } = await abrir("lote-safra-24", "Lote Safra 24", "?aba=movimentacoes");

    await user.click(screen.getByRole("button", { name: /baixa de animais/i }));
    const dialogo = within(await screen.findByRole("dialog", { name: "Baixa de animais" }));
    await user.click(dialogo.getByRole("button", { name: "Registrar baixa" }));

    expect(dialogo.getByRole("alert")).toHaveTextContent(
      "Selecione exatamente 1 animal. Agora há 0 selecionados.",
    );

    const quantidade = dialogo.getByLabelText("Quantidade");
    await user.clear(quantidade);
    await user.type(quantidade, "32");
    expect(quantidade).toHaveAccessibleDescription("O saldo é de 31 animais.");
  });
});
