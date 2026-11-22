import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const rebanho = "/fazenda/baixada/rebanho";

async function abrirNovo(query = "") {
  const view = renderRoute(`${rebanho}/novo${query}`);
  await screen.findByRole("heading", { level: 1, name: /cadastrar no rebanho/i });
  return view;
}

describe("Cadastro no rebanho", () => {
  it("começa em lote com 38 cabeças e leva o passo para a URL", async () => {
    const { user, router } = await abrirNovo();

    expect(screen.getByRole("radio", { name: /um lote de animais/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("Quantas cabeças?")).toHaveValue("38");

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: /dados do registro/i })).toBeInTheDocument();
    expect(new URLSearchParams(router.state.location.search).get("passo")).toBe("2");
  });

  it("lote com menos de 2 cabeças não avança", async () => {
    const { user, router } = await abrirNovo();

    const quantidade = screen.getByLabelText("Quantas cabeças?");
    await user.clear(quantidade);
    await user.type(quantidade, "1");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByText(/um lote precisa ter pelo menos 2 cabeças/i),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("data de formação não pode ser futura", async () => {
    const { user, router } = await abrirNovo("?passo=2");

    const data = screen.getByLabelText("Data de formação");
    expect(data).toHaveAttribute("max", "2026-11-20");
    fireEvent.change(data, { target: { value: "2026-12-01" } });

    expect(data).toHaveAccessibleDescription(/a data de formação não pode ser futura/i);
    await user.type(screen.getByLabelText("Identificação"), "Lote Safra 25");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(new URLSearchParams(router.state.location.search).get("passo")).toBe("2");
  });

  it("custo de aquisição só aparece quando a origem é compra", async () => {
    const { user } = await abrirNovo("?passo=2");

    expect(screen.getByLabelText("Custo de aquisição (opcional)")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /nascimento na propriedade/i }));
    expect(screen.queryByLabelText("Custo de aquisição (opcional)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /compra \(aquisição\)/i }));
    expect(screen.getByLabelText("Custo de aquisição (opcional)")).toBeInTheDocument();
  });

  it("nome repetido na propriedade mostra erro na identificação", async () => {
    const { user } = await abrirNovo("?passo=2");

    const nome = screen.getByLabelText("Identificação");
    await user.type(nome, "lote safra 24");

    expect(nome).toHaveAccessibleDescription(/já existe um lote ou animal com este nome/i);
  });

  it("um animal tem o campo Data aproximada", async () => {
    const { user } = await abrirNovo("?modo=animal");

    expect(screen.getByRole("radio", { name: /^um animal/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByLabelText("Quantas cabeças?")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("checkbox", { name: /data aproximada/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Brinco")).toBeInTheDocument();
  });

  it("a revisão diz quantos animais serão criados", async () => {
    const { user } = await abrirNovo();

    const quantidade = screen.getByLabelText("Quantas cabeças?");
    await user.clear(quantidade);
    await user.type(quantidade, "12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(await screen.findByLabelText("Identificação"), "Lote Safra 25");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Revisar" }));

    expect(await screen.findByText("Vamos criar 12 animais neste lote.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cadastrar lote" })).toBeInTheDocument();
  });

  it("com a quantidade padrão, a revisão fala em 38 animais", async () => {
    const { user } = await abrirNovo();

    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(await screen.findByLabelText("Identificação"), "Lote Safra 25");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: "Revisar" }));

    expect(await screen.findByText("Vamos criar 38 animais neste lote.")).toBeInTheDocument();
  });
});

describe("Edição de registro do rebanho", () => {
  it("não deixa mudar modo e quantidade nem duplicar o lote", async () => {
    renderRoute(`${rebanho}/lote-safra-24/editar`);
    await screen.findByRole("heading", { level: 1, name: "Lote Safra 24" });

    expect(screen.getByText("EDITAR LOTE")).toBeInTheDocument();
    expect(screen.getByLabelText("Identificação")).toHaveValue("Lote Safra 24");
    expect(screen.getByText(/o modo e a quantidade não mudam na edição/i)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /como você acompanha/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Quantas cabeças?")).not.toBeInTheDocument();
    expect(screen.queryByText(/duplicar lote/i)).not.toBeInTheDocument();
  });

  it("registro com histórico é inativado, não excluído", async () => {
    const { user } = renderRoute(`${rebanho}/lote-safra-24/editar`);
    await screen.findByRole("heading", { level: 1, name: "Lote Safra 24" });

    expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Inativar lote" }));

    const dialogo = await screen.findByRole("dialog", { name: "Inativar Lote Safra 24?" });
    expect(dialogo).toHaveTextContent(/são preservados/i);
    expect(dialogo).not.toHaveTextContent(/serão apagados/i);
  });

  it("lote vendido abre travado, com correção por justificativa", async () => {
    renderRoute(`${rebanho}/lote-recria-23/editar`);
    await screen.findByRole("heading", { level: 1, name: "Lote Recria 23" });

    expect(screen.getByText(/lote vendido\. os dados estão travados/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Corrigir com justificativa" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Identificação")).not.toBeInTheDocument();
  });
});
