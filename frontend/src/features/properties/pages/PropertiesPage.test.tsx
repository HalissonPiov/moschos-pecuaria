import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { sair } from "@/features/auth/api";
import { cadastrarPropriedade, listarPropriedades } from "@/features/properties/api";
import { guardarUltimaPropriedade } from "@/features/properties/model";
import { comRecursos } from "@/test/recursos";
import { usuarioDemo } from "@/test/fakes";
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

  it("o cabeçalho mostra o usuário da sessão", async () => {
    renderRoute("/propriedades");

    expect(await screen.findByText("João Batista")).toBeInTheDocument();
    expect(screen.getByText("JB")).toBeInTheDocument();
  });

  it("marca a última propriedade usada neste aparelho, por usuário (P6)", async () => {
    guardarUltimaPropriedade(99, "baixada"); // outro usuário no mesmo aparelho
    guardarUltimaPropriedade(usuarioDemo.id, "serra-bonita");
    renderRoute("/propriedades");

    expect(within(await cartao("Sítio Serra Bonita")).getByText("Última usada")).toBeInTheDocument();
    expect(within(await cartao("Fazenda da Baixada")).queryByText("Última usada")).not.toBeInTheDocument();
    localStorage.clear();
  });

  it("na v1.0 o cartão não tem menu de editar, alterar titular ou inativar (A5)", async () => {
    renderRoute("/propriedades");

    await cartao("Fazenda da Baixada");
    expect(screen.queryByRole("button", { name: /mais opções/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mostrar inativas/i)).not.toBeInTheDocument();
  });

  it("erro ao carregar oferece tentar de novo", async () => {
    vi.mocked(listarPropriedades).mockRejectedValueOnce(new ApiError("Sem conexão.", 0));
    const { user } = renderRoute("/propriedades");

    expect(
      await screen.findByRole("heading", { name: "Não conseguimos carregar suas propriedades" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await cartao("Fazenda da Baixada")).toBeInTheDocument();
    expect(listarPropriedades).toHaveBeenCalledTimes(2);
  });

  it("Sair encerra a sessão e volta para a tela de acesso", async () => {
    const { user, pathname } = renderRoute("/propriedades");

    await user.click(await screen.findByRole("button", { name: "Sair da conta" }));

    expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    expect(pathname()).toBe("/entrar");
    expect(sair).toHaveBeenCalledTimes(1);
  });

  it("usuário novo vê o estado vazio", async () => {
    vi.mocked(listarPropriedades).mockResolvedValueOnce([]);
    const { user } = renderRoute("/propriedades");

    expect(
      await screen.findByRole("heading", { name: "Cadastre sua primeira propriedade" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cadastrar primeira propriedade" }));
    expect(await screen.findByRole("dialog", { name: "Cadastrar propriedade" })).toBeInTheDocument();
  });
});

describe("minhas propriedades · menu do cartão (A5, quando religado)", () => {
  comRecursos("gestaoDeMembros", "edicaoDaPropriedade");

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

  it("não oferece logo nem capa (M2)", async () => {
    renderRoute("/propriedades?cadastro=1");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    expect(dialogo.queryByText(/logo/i)).not.toBeInTheDocument();
    expect(dialogo.queryByText(/foto de capa/i)).not.toBeInTheDocument();
  });

  it("envia os dados, o papel e o aceite do termo e abre a propriedade criada (RN35)", async () => {
    const { user, pathname, router } = renderRoute("/propriedades?cadastro=1");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    await user.type(dialogo.getByLabelText("Nome da propriedade"), "Sítio Novo");
    await user.type(dialogo.getByLabelText("Município"), "Viçosa");
    await user.type(dialogo.getByLabelText("Área em hectares (opcional)"), "1.234,5");
    await user.click(dialogo.getByRole("radio", { name: /faço a gestão/i }));
    await user.type(dialogo.getByLabelText("Nome do dono da propriedade"), "Rosa Lima");
    await user.click(dialogo.getByRole("checkbox", { name: /declaro que/i }));
    await user.click(dialogo.getAllByRole("button", { name: "Cadastrar propriedade" })[0]);

    expect(
      await screen.findByText(
        "Propriedade cadastrada. Criamos 5 categorias de custo para você começar.",
      ),
    ).toBeInTheDocument();
    expect(cadastrarPropriedade).toHaveBeenCalledWith({
      nome: "Sítio Novo",
      municipio: "Viçosa",
      uf: "MG",
      area_hectares: "1234.50",
      titular_nome: "Rosa Lima",
      papel: "gestor",
      aceite_termo: true,
      versao_termo: "1.0",
    });
    expect(pathname()).toBe("/fazenda/nova-propriedade/resumo");
    expect(router.state.location.search).toBe("?nova=5");
  });

  it("falha da API mantém o cadastro aberto com a mensagem", async () => {
    vi.mocked(cadastrarPropriedade).mockRejectedValueOnce(
      new ApiError("O termo de declaração mudou. Leia a versão atual e aceite de novo.", 422),
    );
    const { user, pathname } = renderRoute("/propriedades?cadastro=1");
    const dialogo = within(await screen.findByRole("dialog", { name: "Cadastrar propriedade" }));

    await user.type(dialogo.getByLabelText("Nome da propriedade"), "Sítio Novo");
    await user.type(dialogo.getByLabelText("Município"), "Viçosa");
    await user.click(dialogo.getByRole("checkbox", { name: /declaro que/i }));
    await user.click(dialogo.getAllByRole("button", { name: "Cadastrar propriedade" })[0]);

    expect(await dialogo.findByRole("alert")).toHaveTextContent(/o termo de declaração mudou/i);
    expect(pathname()).toBe("/propriedades");
    expect(dialogo.getAllByRole("button", { name: "Tentar de novo" })[0]).toBeEnabled();
  });
});
