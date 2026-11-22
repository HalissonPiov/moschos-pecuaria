import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

describe("aceitar convite", () => {
  it("convite válido mostra a propriedade, o papel e trava a declaração até entrar", async () => {
    renderRoute("/convite/valido");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Ana Batista convidou você para a Fazenda da Baixada como Gestor.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Gestor · definido no convite")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Declaração do gestor" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /faço a gestão com a permissão/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aceitar convite" })).toBeDisabled();
  });

  it("depois de entrar, aceitar sem marcar o termo pede o aceite", async () => {
    const { user } = renderRoute("/convite/valido");

    await user.type(await screen.findByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-segura");
    await user.click(screen.getByRole("button", { name: "Entrar e continuar" }));

    expect(await screen.findByText("Você entrou como ana@exemplo.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceitar convite" }));
    expect(screen.getByRole("checkbox", { name: /declaro que/i })).toHaveAccessibleDescription(
      "Para continuar, aceite o termo.",
    );
  });

  it("aceitar com o termo marcado vincula o usuário à propriedade", async () => {
    const { user } = renderRoute("/convite/valido?logado=1");

    await user.click(await screen.findByRole("checkbox", { name: /declaro que/i }));
    await user.click(screen.getByRole("button", { name: "Aceitar convite" }));

    expect(
      await screen.findByText("Você agora faz parte da Fazenda da Baixada.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("o termo do convite é o do papel definido (gestor ou proprietário)", async () => {
    const { user, unmount } = renderRoute("/convite/valido?logado=1");

    await user.click(await screen.findByRole("button", { name: "Termo de declaração" }));
    const termoGestor = await screen.findByRole("dialog", { name: "Termo de declaração do gestor" });
    expect(within(termoGestor).getByText(/versão 1\.0/i)).toBeInTheDocument();
    unmount();

    const dono = renderRoute("/convite/baixada-proprietario-7d-abcd?logado=1");
    expect(
      await screen.findByRole("heading", { name: /como proprietário\.$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Declaração do proprietário" })).toBeInTheDocument();
    await dono.user.click(screen.getByRole("button", { name: "Termo de declaração" }));
    expect(
      await screen.findByRole("dialog", { name: "Termo de declaração do proprietário" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["expirado", "Este convite venceu", /venceu em 15\/11\/2026/i],
    ["revogado", "Convite revogado", /cancelou o acesso/i],
    ["usado", "Este convite já foi usado", /vale uma única vez/i],
  ])("convite %s explica o motivo e volta para entrar", async (token, titulo, texto) => {
    renderRoute(`/convite/${token}`);

    expect(await screen.findByRole("heading", { level: 1, name: titulo })).toBeInTheDocument();
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute(
      "href",
      "/entrar",
    );
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).not.toBeInTheDocument();
  });

  it("quem já é membro pode abrir a propriedade", async () => {
    const { user, pathname } = renderRoute("/convite/membro");

    expect(
      await screen.findByRole("heading", { name: "Você já faz parte desta propriedade" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Abrir propriedade" }));
    expect(pathname()).toBe("/fazenda/baixada/resumo");
  });
});
