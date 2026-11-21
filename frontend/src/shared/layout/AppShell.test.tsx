import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

/** Abre o seletor de propriedade da barra lateral (o primeiro na página). */
async function abrirSeletor(user: ReturnType<typeof renderRoute>["user"]) {
  const [botao] = await screen.findAllByRole("button", { name: /^propriedade ·/i });
  await user.click(botao);
  return within(screen.getByRole("group", { name: "Trocar propriedade" }));
}

describe("estrutura do app", () => {
  it("o seletor lista cada propriedade com o seu papel", async () => {
    const { user } = renderRoute("/fazenda/baixada/resumo");

    const seletor = await abrirSeletor(user);

    expect(seletor.getByRole("button", { name: /fazenda da baixada.*você é proprietário/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(seletor.getByRole("button", { name: /sítio serra bonita.*você é gestor/i })).toBeInTheDocument();
    expect(seletor.getByRole("button", { name: /fazenda cedro alto.*você é gestor/i })).toBeInTheDocument();
    expect(seletor.getByRole("link", { name: "Ver todas as propriedades" })).toHaveAttribute(
      "href",
      "/propriedades",
    );
  });

  it("trocar de propriedade muda a rota e avisa", async () => {
    const { user, pathname } = renderRoute("/fazenda/baixada/resumo");

    const seletor = await abrirSeletor(user);
    await user.click(seletor.getByRole("button", { name: /sítio serra bonita/i }));

    expect(pathname()).toBe("/fazenda/serra-bonita/resumo");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Agora você está na Sítio Serra Bonita.",
    );
    expect(
      screen.getAllByRole("button", { name: /^propriedade · gestor\s*sítio serra bonita/i })[0],
    ).toBeInTheDocument();
  });

  it("trocar de propriedade a partir do Rebanho leva ao Resumo da outra", async () => {
    const { user, pathname } = renderRoute("/fazenda/baixada/rebanho");

    const seletor = await abrirSeletor(user);
    await user.click(seletor.getByRole("button", { name: /fazenda cedro alto/i }));

    expect(pathname()).toBe("/fazenda/cedro-alto/resumo");
  });

  it("Sair volta para a tela de acesso", async () => {
    const { user, pathname } = renderRoute("/fazenda/baixada/resumo");

    await user.click(await screen.findByRole("button", { name: "Sair" }));

    expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    expect(pathname()).toBe("/entrar");
    expect(screen.getByRole("status")).toHaveTextContent("Você saiu da sua conta.");
  });

  it("o Rebanho da Serra Bonita não mostra os lotes da Baixada", async () => {
    renderRoute("/fazenda/serra-bonita/rebanho");

    expect(await screen.findByRole("heading", { level: 1, name: /^rebanho$/i })).toBeInTheDocument();
    expect(screen.queryByText(/lote safra 24/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lote bezerros sul/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/boi 047/i)).not.toBeInTheDocument();
  });
});
