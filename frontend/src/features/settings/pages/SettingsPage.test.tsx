import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderRoute } from "@/test/renderRoute";
import { comRecursos } from "@/test/recursos";
import { sair } from "@/features/auth/api";

const configuracoes = "/fazenda/baixada/configuracoes";

async function abrirConfiguracoes(path = configuracoes) {
  const view = renderRoute(path);
  await screen.findByRole("heading", { level: 1, name: "Configurações" });
  return view;
}

function secao(nome: string) {
  return screen.getByRole("region", { name: nome });
}

describe("Configurações · v1.0 (pacote 3)", () => {
  it("só mostra as seções já integradas", async () => {
    await abrirConfiguracoes();
    const nav = screen.getByRole("navigation", { name: "Seções de Configurações" });

    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Sua conta",
      "Propriedade ativa",
      "Como calculamos",
      "Em breve",
    ]);
    for (const oculta of ["Parâmetros da propriedade", "Cadastros", "Membros e convites", "Relatórios"]) {
      expect(screen.queryByRole("region", { name: oculta })).not.toBeInTheDocument();
    }
  });

  it("Sua conta mostra o usuário da sessão, sem troca de senha nem edição de perfil", async () => {
    await abrirConfiguracoes();
    const conta = secao("Sua conta");

    expect(conta).toHaveTextContent("João Batista");
    expect(conta).toHaveTextContent("joao@fazendadabaixada.com.br");
    expect(within(conta).queryByText("Trocar senha")).not.toBeInTheDocument();
    expect(within(conta).queryByLabelText("Editar perfil")).not.toBeInTheDocument();
  });

  it("Propriedade ativa mostra titular e termo, sem alterar titular nem inativar (A5)", async () => {
    await abrirConfiguracoes();
    const propriedade = secao("Propriedade ativa");

    expect(propriedade).toHaveTextContent("Titular: João Batista e Maria Aparecida Batista");
    expect(within(propriedade).queryByRole("button", { name: "Alterar titular" })).not.toBeInTheDocument();
    expect(within(propriedade).queryByText("Inativar propriedade")).not.toBeInTheDocument();
  });

  it("Sair encerra a sessão", async () => {
    const { user, pathname } = await abrirConfiguracoes();

    await user.click(within(secao("Sua conta")).getByRole("button", { name: /sair/i }));

    expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    expect(pathname()).toBe("/entrar");
    expect(sair).toHaveBeenCalledTimes(1);
  });
});

describe("Configurações · parâmetros e termo", () => {
  comRecursos("parametrosDaPropriedade");

  it("mostra os parâmetros padrão da propriedade", async () => {
    await abrirConfiguracoes();
    const parametros = secao("Parâmetros da propriedade");

    expect(within(parametros).getByLabelText("Rendimento de carcaça padrão (%)")).toHaveValue("50");
    expect(within(parametros).getByLabelText("Praça padrão de cotação")).toHaveValue("Minas Gerais");
    expect(within(parametros).getByLabelText("Dias de aviso antes do vencimento")).toHaveValue("7");
  });

  it("valida o rendimento entre 1 e 100 e os dias de aviso", async () => {
    const { user } = await abrirConfiguracoes();
    const parametros = secao("Parâmetros da propriedade");
    const rendimento = within(parametros).getByLabelText("Rendimento de carcaça padrão (%)");
    const dias = within(parametros).getByLabelText("Dias de aviso antes do vencimento");
    const salvar = within(parametros).getByRole("button", { name: "Salvar parâmetros" });

    await user.clear(rendimento);
    await user.type(rendimento, "101");
    await user.clear(dias);
    await user.type(dias, "0");
    await user.click(salvar);
    expect(rendimento).toHaveAccessibleDescription(/informe um rendimento entre 1% e 100%/i);
    expect(dias).toHaveAccessibleDescription(/número inteiro de dias entre 1 e 60/i);

    await user.clear(rendimento);
    await user.type(rendimento, "0");
    await user.click(salvar);
    expect(rendimento).toHaveAccessibleDescription(/informe um rendimento entre 1% e 100%/i);

    await user.clear(rendimento);
    await user.type(rendimento, "100");
    await user.clear(dias);
    await user.type(dias, "10");
    await user.click(salvar);
    expect(await screen.findByText("Parâmetros da propriedade atualizados.")).toBeInTheDocument();
    expect(rendimento).not.toHaveAccessibleDescription();
  });

  it("mostra o papel, a data e a versão do termo aceito", async () => {
    await abrirConfiguracoes();
    const propriedade = secao("Propriedade ativa");

    expect(propriedade).toHaveTextContent("Seu papel: Proprietário");
    expect(propriedade).toHaveTextContent("Termo aceito em 18/01/2024 (versão 1.0)");
    expect(within(propriedade).getByRole("button", { name: "Ver termo" })).toBeInTheDocument();
  });
});

describe("Configurações · cadastros e em breve", () => {
  comRecursos("cadastrosDaPropriedade");

  it("tem abas de pastos, fornecedores, compradores e categorias", async () => {
    const { user } = await abrirConfiguracoes();
    const cadastros = secao("Cadastros");
    const abas = within(cadastros).getByRole("group", { name: "Tipo de cadastro" });

    expect(cadastros).toHaveTextContent("Piquete da Serra");
    await user.click(within(abas).getByRole("button", { name: "Fornecedores" }));
    expect(cadastros).toHaveTextContent("Agropecuária Ponte Nova");
    await user.click(within(abas).getByRole("button", { name: "Categorias" }));
    expect(cadastros).toHaveTextContent("Locação de pasto");
    await user.click(within(abas).getByRole("button", { name: "Compradores" }));
    expect(cadastros).toHaveTextContent("Frigorífico União");
    expect(cadastros).toHaveTextContent("José Carlos");
  });

  it("só exclui cadastro sem vínculo; com vínculo, inativa", async () => {
    const { user } = await abrirConfiguracoes(`${configuracoes}?cadastro=comprador`);
    const cadastros = secao("Cadastros");

    expect(within(cadastros).getByRole("button", { name: "Inativar Frigorífico União" })).toBeInTheDocument();
    await user.click(within(cadastros).getByRole("button", { name: "Excluir José Carlos" }));

    const excluir = await screen.findByRole("dialog", { name: "Excluir cadastro?" });
    await user.click(within(excluir).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("José Carlos excluído.")).toBeInTheDocument();
    expect(cadastros).not.toHaveTextContent("José Carlos");
  });

  it("não aceita dois cadastros com o mesmo nome", async () => {
    const { user } = await abrirConfiguracoes(`${configuracoes}?cadastro=comprador`);

    await user.click(within(secao("Cadastros")).getByRole("button", { name: "Adicionar comprador" }));
    const form = await screen.findByRole("dialog", { name: "Adicionar comprador" });
    await user.type(within(form).getByLabelText("Nome"), "frigorífico união");
    await user.click(within(form).getByRole("button", { name: "Salvar" }));

    expect(within(form).getByLabelText("Nome")).toHaveAccessibleDescription(
      /já existe um comprador com este nome/i,
    );
  });

  it("boleto pela linha digitável e convite por e-mail aparecem como \"Em breve\"", async () => {
    await abrirConfiguracoes();

    for (const item of ["Registro de boleto pela linha digitável", "Convite por e-mail"]) {
      const linha = screen.getByText(item).closest("li")!;
      expect(within(linha).getByText("Em breve")).toBeInTheDocument();
    }
  });
});

describe("Configurações · membros e convites", () => {
  comRecursos("gestaoDeMembros");

  it("o proprietário remove um gestor e o último membro fica protegido", async () => {
    const { user } = await abrirConfiguracoes();
    const membros = secao("Membros e convites");

    expect(membros).toHaveTextContent("João Batista Você");
    expect(membros).toHaveTextContent("Proprietário");
    expect(membros).toHaveTextContent("ana@fazendadabaixada.com.br · Gestor");

    await user.click(within(membros).getByRole("button", { name: "Remover Ana Batista" }));
    const remover = await screen.findByRole("dialog", { name: "Remover membro?" });
    await user.click(within(remover).getByRole("button", { name: "Remover membro" }));

    expect(await screen.findByText("Ana Batista foi removido da propriedade.")).toBeInTheDocument();
    for (const sair of within(membros).getAllByRole("button", { name: "Sair desta propriedade" })) {
      expect(sair).toBeDisabled();
    }
    expect(
      within(membros).getAllByText("A propriedade precisa de pelo menos um membro.").length,
    ).toBeGreaterThan(0);
  });

  it("gestor não remove o proprietário e vê o motivo", async () => {
    await abrirConfiguracoes("/fazenda/cedro-alto/configuracoes");
    const membros = secao("Membros e convites");

    expect(within(membros).getByRole("button", { name: "Remover Lúcia Andrade" })).toBeDisabled();
    expect(membros).toHaveTextContent("Só o proprietário pode remover membros.");
    for (const sair of within(membros).getAllByRole("button", { name: "Sair desta propriedade" })) {
      expect(sair).toBeEnabled();
    }
  });

  it("convite: escolhe papel e validade, mostra o link uma vez e permite copiar e enviar", async () => {
    const { user } = await abrirConfiguracoes();
    const copiar = vi.spyOn(navigator.clipboard, "writeText");

    await user.click(screen.getByRole("button", { name: "Convidar pessoa" }));
    let convite = await screen.findByRole("dialog", { name: "Convidar pessoa" });
    await user.selectOptions(within(convite).getByLabelText("Papel"), "Proprietário");
    await user.selectOptions(within(convite).getByLabelText("Validade"), "30");
    await user.click(within(convite).getByRole("button", { name: "Gerar link de uso único" }));

    expect(convite).toHaveTextContent("por segurança, este link não aparece de novo");
    const link = within(convite).getByText(/\/convite\/baixada-proprietario-30d-/).textContent!;

    await user.click(within(convite).getByRole("button", { name: "Copiar link" }));
    expect(copiar).toHaveBeenCalledWith(link);
    expect(await screen.findByText("Link copiado.")).toBeInTheDocument();

    const whatsapp = within(convite).getByRole("link", { name: "Enviar pelo WhatsApp" });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(whatsapp.getAttribute("href")!)).toContain(link);

    await user.click(within(convite).getByRole("button", { name: "Fechar" }));
    expect(secao("Membros e convites")).toHaveTextContent("Proprietário · Pendente");

    await user.click(screen.getByRole("button", { name: "Convidar pessoa" }));
    convite = await screen.findByRole("dialog", { name: "Convidar pessoa" });
    expect(within(convite).queryByText(link)).not.toBeInTheDocument();
    expect(within(convite).getByRole("button", { name: "Gerar link de uso único" })).toBeInTheDocument();
  });

  it("revoga um convite pendente", async () => {
    const { user } = await abrirConfiguracoes();
    const membros = secao("Membros e convites");

    expect(membros).toHaveTextContent("Gestor · Pendente");
    await user.click(within(membros).getByRole("button", { name: "Revogar" }));
    const revogar = await screen.findByRole("dialog", { name: "Revogar convite?" });
    await user.click(within(revogar).getByRole("button", { name: "Revogar" }));

    expect(await screen.findByText("Convite revogado.")).toBeInTheDocument();
    expect(membros).toHaveTextContent("Nenhum convite pendente.");
    expect(membros).toHaveTextContent("Gestor · Revogado");
  });
});

describe("Configurações · relatórios", () => {
  comRecursos("relatorios");

  it("filtra por lote, mostra a prévia e gera o PDF", async () => {
    const { user } = await abrirConfiguracoes();
    const relatorios = secao("Relatórios");

    const previa = within(relatorios).getByRole("table", { name: "Prévia do relatório custos por lote" });
    expect(within(previa).getByRole("rowheader", { name: "Lote Safra 24" })).toBeInTheDocument();
    expect(within(previa).getByRole("rowheader", { name: "Boi 047" })).toBeInTheDocument();

    await user.selectOptions(within(relatorios).getByLabelText("Lotes"), "lote-safra-24");
    await user.selectOptions(within(relatorios).getByLabelText("Tipo"), "Margens por lote");
    await user.selectOptions(within(relatorios).getByLabelText("Formato"), "PDF");

    const margens = within(relatorios).getByRole("table", { name: "Prévia do relatório margens por lote" });
    expect(within(margens).getAllByRole("rowheader")).toHaveLength(1);
    expect(margens).toHaveTextContent("R$ 21.501,33");
    expect(margens).toHaveTextContent("sobre custos diretos · parcial");

    await user.click(within(relatorios).getByRole("button", { name: "Gerar relatório" }));
    expect(within(relatorios).getByRole("button", { name: "Preparando seu relatório…" })).toBeDisabled();

    expect(
      await within(relatorios).findByRole("button", { name: "Baixar PDF" }, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(relatorios).toHaveTextContent("Relatório pronto para baixar (1 linha).");
    expect(screen.getByText("Relatório pronto (PDF).")).toBeInTheDocument();
  });

  it("formato CSV disponível e erro na geração permite tentar de novo", async () => {
    const { user } = await abrirConfiguracoes(`${configuracoes}?relatorio-estado=erro`);
    const relatorios = secao("Relatórios");

    expect(within(relatorios).getByLabelText("Formato")).toHaveValue("CSV");
    await user.click(within(relatorios).getByRole("button", { name: "Gerar relatório" }));

    expect(
      await within(relatorios).findByRole("alert", {}, { timeout: 2000 }),
    ).toHaveTextContent("Não foi possível gerar o relatório");
    await user.click(within(relatorios).getByRole("button", { name: "Tentar de novo" }));

    expect(
      await within(relatorios).findByRole("button", { name: "Baixar CSV" }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });

  it("sem dados mostra \"Nenhum dado neste período\"", async () => {
    const { user } = await abrirConfiguracoes(`${configuracoes}?relatorio-estado=vazio`);
    const relatorios = secao("Relatórios");

    expect(relatorios).toHaveTextContent("Nenhum dado neste período");
    expect(within(relatorios).queryByRole("table")).not.toBeInTheDocument();

    await user.click(within(relatorios).getByRole("button", { name: "Gerar relatório" }));
    await within(relatorios).findByRole("button", { name: "Gerar relatório" }, { timeout: 2000 });
    expect(relatorios).toHaveTextContent("Nenhum dado neste período");
  });
});

describe("Configurações · relatórios por período (C5.10)", () => {
  comRecursos("relatorios");

  it("margens somam só as vendas do período escolhido", async () => {
    const { user } = await abrirConfiguracoes();
    const relatorios = secao("Relatórios");
    await user.selectOptions(within(relatorios).getByLabelText("Tipo"), "Margens por lote");

    const margens = within(relatorios).getByRole("table", { name: "Prévia do relatório margens por lote" });
    expect(within(margens).getAllByRole("rowheader").map((linha) => linha.textContent)).toEqual([
      "Lote Safra 24",
      "Lote Recria 23",
    ]);
    expect(relatorios).toHaveTextContent("Este ano: margem líquida das vendas feitas no período.");

    await user.selectOptions(within(relatorios).getByLabelText("Período"), "Ano passado");

    expect(relatorios).toHaveTextContent("Nenhum dado neste período");
    expect(within(relatorios).queryByRole("table")).not.toBeInTheDocument();
  });

  it("custos mostram os lotes que estiveram na propriedade no período", async () => {
    const { user } = await abrirConfiguracoes();
    const relatorios = secao("Relatórios");

    await user.selectOptions(within(relatorios).getByLabelText("Período"), "Últimos 12 meses");

    const previa = within(relatorios).getByRole("table", { name: "Prévia do relatório custos por lote" });
    expect(within(previa).getAllByRole("rowheader")).toHaveLength(5);
    expect(relatorios).toHaveTextContent(
      "Últimos 12 meses: lotes e animais que estiveram na propriedade no período, com o custo acumulado até hoje.",
    );
  });
});
