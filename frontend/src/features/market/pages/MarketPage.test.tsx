import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const mercado = "/fazenda/baixada/mercado";

async function abrirMercado(path = mercado) {
  const view = renderRoute(path);
  await screen.findByRole("heading", { level: 1, name: "Cotações da arroba" });
  return view;
}

async function abrirFormulario(user: ReturnType<typeof renderRoute>["user"]) {
  await user.click(screen.getByRole("button", { name: "Registrar cotação" }));
  return screen.findByRole("dialog", { name: "Registrar cotação" });
}

describe("Mercado · registrar cotação", () => {
  it("exige a fonte da cotação", async () => {
    const { user } = await abrirMercado();
    const form = await abrirFormulario(user);

    await user.type(within(form).getByLabelText("Valor da arroba (R$ / @)"), "320,00");
    await user.clear(within(form).getByLabelText("Fonte"));
    await user.click(within(form).getByRole("button", { name: "Salvar cotação" }));

    expect(within(form).getByLabelText("Fonte")).toHaveAccessibleDescription(
      /informe a fonte da cotação/i,
    );
    expect(screen.getByRole("dialog", { name: "Registrar cotação" })).toBeInTheDocument();
  });

  it("exige o nome da praça quando é uma nova praça", async () => {
    const { user } = await abrirMercado();
    const form = await abrirFormulario(user);

    await user.selectOptions(within(form).getByLabelText("Praça"), "nova");
    await user.type(within(form).getByLabelText("Valor da arroba (R$ / @)"), "320,00");
    await user.click(within(form).getByRole("button", { name: "Salvar cotação" }));

    expect(within(form).getByLabelText("Nome da nova praça")).toHaveAccessibleDescription(
      /informe o nome da nova praça/i,
    );
  });

  it("cotação repetida na mesma praça e data pede para substituir", async () => {
    const { user } = await abrirMercado();
    const form = await abrirFormulario(user);

    fireEvent.change(within(form).getByLabelText("Data"), { target: { value: "2026-11-06" } });
    await user.type(within(form).getByLabelText("Valor da arroba (R$ / @)"), "320,00");
    await user.click(within(form).getByRole("button", { name: "Salvar cotação" }));

    const duplicada = await screen.findByRole("dialog", { name: "Cotação já registrada" });
    expect(duplicada).toHaveTextContent(
      "Já existe uma cotação de Minas Gerais em 06/11/2026 pelo Escritório local (R$ 318,00)",
    );
    await user.click(within(duplicada).getByRole("button", { name: "Substituir" }));

    expect(await screen.findByText("Cotação substituída pelo novo valor.")).toBeInTheDocument();
    const historico = screen.getByRole("region", { name: "Cotações registradas" });
    expect(historico).toHaveTextContent("06/11/2026");
    expect(historico).toHaveTextContent("R$ 320,00 / @");
    expect(within(historico).queryByText("R$ 318,00 / @")).not.toBeInTheDocument();
  });
});

describe("Mercado · histórico e mapa", () => {
  it("separa o histórico por praça", async () => {
    const { user } = await abrirMercado();
    const form = await abrirFormulario(user);

    await user.selectOptions(within(form).getByLabelText("Praça"), "Zona da Mata — MG");
    await user.type(within(form).getByLabelText("Valor da arroba (R$ / @)"), "315,50");
    await user.click(within(form).getByRole("button", { name: "Salvar cotação" }));

    expect(await screen.findByText("Cotação registrada no histórico.")).toBeInTheDocument();
    const historico = screen.getByRole("region", { name: "Cotações registradas" });
    expect(
      within(historico).getByRole("img", {
        name: /Minas Gerais, última R\$ 318,00 em 06\/11\/2026; Zona da Mata — MG, última R\$ 315,50 em 20\/11\/2026/,
      }),
    ).toBeInTheDocument();
    expect(historico).toHaveTextContent("Zona da Mata — MG · Escritório local");
  });

  it("filtra o histórico pelo período", async () => {
    const { user, router } = await abrirMercado();
    const historico = screen.getByRole("region", { name: "Cotações registradas" });

    expect(historico).toHaveTextContent("14/10/2026");
    await user.click(
      within(screen.getByRole("group", { name: "Período das cotações registradas" })).getByRole(
        "button",
        { name: "30 dias" },
      ),
    );

    expect(new URLSearchParams(router.state.location.search).get("historico")).toBe("30 dias");
    expect(historico).not.toHaveTextContent("14/10/2026");
    expect(historico).toHaveTextContent("28/10/2026");
    expect(historico).toHaveTextContent("06/11/2026");
  });

  it("o mapa é identificado como dados ilustrativos e não entra nas contas", async () => {
    const { user, router } = await abrirMercado();

    expect(
      screen.getByRole("img", { name: "Mapa do Brasil com cotações ilustrativas por praça" }),
    ).toBeInTheDocument();
    expect(screen.getByText("BRASIL · DADOS ILUSTRATIVOS")).toBeInTheDocument();
    expect(
      screen.getByText("O mapa mostra dados ilustrativos. Para as contas, vale a cotação que você registrar."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^São Paulo, referência ilustrativa/ }));

    expect(new URLSearchParams(router.state.location.search).get("uf")).toBe("SP");
    expect(screen.getByRole("heading", { name: "São Paulo" })).toBeInTheDocument();
    expect(screen.getByText(/no período · não usada nas contas/)).toBeInTheDocument();
  });
});
