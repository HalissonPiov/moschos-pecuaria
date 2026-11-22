import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

/** O cartão (article) de uma propriedade, achado pelo nome. */
async function cartao(nome: string) {
  const titulo = await screen.findByRole("heading", { level: 2, name: nome });
  return titulo.closest("article") as HTMLElement;
}

describe("minhas propriedades", () => {
  it.each([
    ["Fazenda da Baixada", "Você é proprietário", "Titularidade confirmada", "João Batista e Maria Aparecida Batista"],
    ["Sítio Serra Bonita", "Você é gestor", "Declarada por gestor", "Geraldo Fonseca"],
    ["Fazenda Cedro Alto", "Você é gestor", "Titularidade confirmada", "Lúcia Andrade"],
  ])("o cartão da %s mostra papel, titularidade e titular", async (nome, papel, titularidade, titular) => {
    renderRoute("/propriedades");
    const card = within(await cartao(nome));

    expect(card.getByText(papel)).toBeInTheDocument();
    expect(card.getByText(titularidade)).toBeInTheDocument();
    expect(card.getByText("Titular").nextElementSibling).toHaveTextContent(titular);
  });

  it("abrir um cartão entra no Resumo da propriedade", async () => {
    const { user, pathname } = renderRoute("/propriedades");

    await user.click(await screen.findByRole("link", { name: "Entrar na Sítio Serra Bonita" }));

    expect(pathname()).toBe("/fazenda/serra-bonita/resumo");
  });

  it("a propriedade inativa aparece apagada e não abre", async () => {
    renderRoute("/propriedades");

    const card = await screen.findByRole("article", { name: "Fazenda Boa Esperança (inativa)" });
    expect(card).toHaveClass("property-card--inactive");
    expect(within(card).getByText("Inativa")).toBeInTheDocument();
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /boa esperança/i })).not.toBeInTheDocument();
  });

  it("o proprietário pode reativar a propriedade inativa", async () => {
    const { user } = renderRoute("/propriedades");

    await user.click(
      await screen.findByRole("button", { name: "Mais opções para Fazenda Boa Esperança" }),
    );
    const reativar = screen.getByRole("button", { name: /reativar/i });
    expect(reativar).toBeEnabled();
    await user.click(reativar);

    expect(await screen.findByRole("link", { name: "Entrar na Fazenda Boa Esperança" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/foi reativada/i);
  });

  it("o gestor de propriedade confirmada não pode reativar", async () => {
    const { user } = renderRoute("/propriedades?inativada=cedro-alto");

    expect(await screen.findByRole("status")).toHaveTextContent(/cedro alto foi inativada/i);
    await user.click(screen.getByRole("button", { name: "Mais opções para Fazenda Cedro Alto" }));

    expect(screen.getByRole("button", { name: /reativar/i })).toBeDisabled();
    expect(screen.getByText("Só o proprietário pode fazer isso.")).toBeInTheDocument();
  });

  it("no menu da Cedro Alto, titular e inativação ficam bloqueados com explicação", async () => {
    const { user } = renderRoute("/propriedades");

    await user.click(
      await screen.findByRole("button", { name: "Mais opções para Fazenda Cedro Alto" }),
    );

    expect(screen.getByRole("button", { name: /editar dados/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /alterar titular/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /inativar propriedade/i })).toBeDisabled();
    expect(screen.getAllByText("Só o proprietário pode fazer isso.")).toHaveLength(2);
    expect(screen.queryByText(/excluir/i)).not.toBeInTheDocument();
  });

  it("na Serra Bonita, sem proprietário vinculado, o gestor pode alterar o titular", async () => {
    const { user, router } = renderRoute("/propriedades");

    await user.click(
      await screen.findByRole("button", { name: "Mais opções para Sítio Serra Bonita" }),
    );
    expect(screen.getByRole("button", { name: /inativar propriedade/i })).toBeEnabled();
    expect(screen.queryByText(/excluir/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /alterar titular/i }));

    const dialogo = await screen.findByRole("dialog", { name: "Alterar titular" });
    expect(router.state.location.search).toContain("acao=titular");
    const campo = within(dialogo).getByLabelText("Nome do titular");
    await user.clear(campo);
    await user.type(campo, "Geraldo e Rosa Fonseca");
    await user.click(within(dialogo).getByRole("button", { name: "Salvar titular" }));

    const card = within(await cartao("Sítio Serra Bonita"));
    expect(card.getByText("Titular").nextElementSibling).toHaveTextContent("Geraldo e Rosa Fonseca");
  });

  it("a ação de titular pela URL é ignorada sem permissão", async () => {
    renderRoute("/propriedades?acao=titular&id=cedro-alto");

    await screen.findByRole("heading", { name: /minhas propriedades/i });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("usuário novo vê o estado vazio", async () => {
    const { user } = renderRoute("/propriedades?estado=empty");

    expect(
      await screen.findByRole("heading", { name: "Cadastre sua primeira propriedade" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cadastrar primeira propriedade" }));
    expect(await screen.findByRole("dialog", { name: "Cadastrar propriedade" })).toBeInTheDocument();
  });
});

describe("cadastro de propriedade", () => {
  it("município e UF são campos separados e a área é opcional, sem CPF nem CNPJ", async () => {
    renderRoute("/propriedades?cadastro=1");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    expect(dialogo.getByLabelText("Município")).toBeRequired();
    expect(dialogo.getByLabelText("UF")).toHaveDisplayValue("MG");
    expect(dialogo.getByLabelText("Área em hectares (opcional)")).not.toBeRequired();
    expect(dialogo.getByText("Não pedimos CPF nem CNPJ.")).toBeInTheDocument();
    expect(dialogo.queryByLabelText(/cpf|cnpj/i)).not.toBeInTheDocument();
  });

  it("'Sou o proprietário' preenche o titular e 'gestor' deixa vazio", async () => {
    const { user } = renderRoute("/propriedades?cadastro=1&passo=2");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    expect(dialogo.getByRole("radio", { name: /sou o proprietário/i })).toBeChecked();
    const titular = dialogo.getByLabelText("Nome do titular");
    expect(titular).toHaveValue("João Batista");
    await user.type(titular, " e Maria");
    expect(titular).toHaveValue("João Batista e Maria");

    await user.click(dialogo.getByRole("radio", { name: /faço a gestão/i }));
    expect(dialogo.getByLabelText("Nome do dono da propriedade")).toHaveValue("");

    await user.click(dialogo.getByRole("radio", { name: /sou o proprietário/i }));
    expect(dialogo.getByLabelText("Nome do titular")).toHaveValue("João Batista");
  });

  it("o termo abre com versão e muda conforme o papel", async () => {
    const { user } = renderRoute("/propriedades?cadastro=1&passo=3");
    const cadastro = await screen.findByRole("dialog", { name: "Cadastrar propriedade" });

    await user.click(within(cadastro).getByRole("button", { name: "Termo de declaração" }));
    let termo = await screen.findByRole("dialog", { name: "Termo de declaração do proprietário" });
    expect(within(termo).getByText(/versão 1\.0/i)).toBeInTheDocument();
    expect(within(termo).getByText(/é titular ou representa os titulares/i)).toBeInTheDocument();
    await user.click(within(termo).getByRole("button", { name: "Entendi" }));

    await user.click(within(cadastro).getByRole("radio", { name: /faço a gestão/i }));
    await user.click(within(cadastro).getByRole("button", { name: "Termo de declaração" }));
    termo = await screen.findByRole("dialog", { name: "Termo de declaração do gestor" });
    expect(within(termo).getByText(/versão 1\.0/i)).toBeInTheDocument();
    expect(within(termo).getByText(/faz a gestão com a permissão do titular/i)).toBeInTheDocument();
  });

  it("no celular o termo abre como folha; Esc fecha só o termo e o foco volta ao link (C1.9)", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("max-width: 760px"),
    })) as typeof window.matchMedia;
    try {
      const { user } = renderRoute("/propriedades?cadastro=1&passo=3");
      const cadastro = await screen.findByRole("dialog", { name: "Cadastrar propriedade" });
      const link = within(cadastro).getByRole("button", { name: "Termo de declaração" });

      await user.click(link);
      expect(
        await screen.findByRole("dialog", { name: "Termo de declaração do proprietário" }),
      ).toHaveAttribute("aria-modal", "true");

      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Termo de declaração do proprietário" }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("dialog", { name: "Cadastrar propriedade" })).toBeInTheDocument();
      expect(link).toHaveFocus();
    } finally {
      window.matchMedia = original;
    }
  });

  it("enviar sem aceitar o termo pede o aceite", async () => {
    const { user, router } = renderRoute("/propriedades?cadastro=1");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    await user.type(dialogo.getByLabelText("Nome da propriedade"), "Sítio Novo");
    await user.type(dialogo.getByLabelText("Município"), "Viçosa");
    await user.click(dialogo.getAllByRole("button", { name: "Cadastrar propriedade" })[0]);

    expect(await dialogo.findByText("Para continuar, aceite o termo.")).toBeInTheDocument();
    expect(dialogo.getByRole("checkbox", { name: /declaro que/i })).toHaveAccessibleDescription(
      "Para continuar, aceite o termo.",
    );
    expect(router.state.location.search).toContain("passo=3");
    expect(router.state.location.pathname).toBe("/propriedades");
  });
});
