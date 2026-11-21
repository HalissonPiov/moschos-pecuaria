import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const rebanho = "/fazenda/baixada/rebanho";

async function abrir(query = "") {
  const view = renderRoute(`${rebanho}${query}`);
  await screen.findByRole("heading", { level: 1, name: /^rebanho$/i });
  return view;
}

/** Nomes dos cartões visíveis, na ordem da tela. */
function cartoes() {
  return screen
    .queryAllByRole("article")
    .map((card) => within(card).getByRole("heading", { level: 2 }).textContent);
}

function cartao(nome: string) {
  const titulo = screen.getByRole("heading", { level: 2, name: nome });
  const card = titulo.closest("article");
  if (!card) throw new Error(`Cartão de ${nome} não encontrado`);
  return within(card);
}

describe("Rebanho: lista", () => {
  it("filtro de status oferece só os cinco status atuais", async () => {
    await abrir();

    const status = screen.getByRole("combobox", { name: /filtrar por status/i });
    const opcoes = within(status)
      .getAllByRole("option")
      .map((opcao) => opcao.textContent);
    expect(opcoes).toEqual([
      "Status: todos",
      "Em produção",
      "Pronto para venda",
      "Parcialmente vendido",
      "Vendido",
      "Encerrado",
    ]);
  });

  it("mostra os cinco registros ativos, sem o inativo e sem agrupar por propriedade", async () => {
    await abrir();

    expect(cartoes()).toEqual([
      "Lote Bezerros Sul",
      "Boi 047",
      "Lote Safra 24",
      "Lote Recria 23",
      "Lote Descarte 22",
    ]);
    expect(screen.queryByText("Lote Teste 21")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /fazenda/i })).not.toBeInTheDocument();
  });

  it("cartão do Lote Safra 24 mostra saldo, custo por cabeça, pastos e origem", async () => {
    await abrir();

    const safra = cartao("Lote Safra 24");
    expect(safra.getByText("31 de 38")).toBeInTheDocument();
    expect(safra.getByText("Custo por cabeça")).toBeInTheDocument();
    expect(safra.getByText("2.230,14")).toBeInTheDocument();
    expect(safra.getByText("3 pastos")).toBeInTheDocument();
    expect(safra.getByText("Aquisição")).toBeInTheDocument();
    expect(safra.getByText("Parcialmente vendido")).toBeInTheDocument();
  });

  it("cartão do Boi 047 avisa que a cotação está abaixo do equilíbrio", async () => {
    await abrir();

    const boi = cartao("Boi 047");
    expect(boi.getByText("Pronto para venda")).toBeInTheDocument();
    expect(boi.getByText("R$ 27,50 / @ abaixo do equilíbrio")).toBeInTheDocument();
    expect(boi.getByText("Piquete 3")).toBeInTheDocument();
  });

  it("usa o termo Pasto, não Local", async () => {
    await abrir();

    expect(screen.getByRole("combobox", { name: /filtrar por pasto/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /local/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^local$/i)).not.toBeInTheDocument();
  });
});

describe("Rebanho: filtros na URL", () => {
  it("abrir com ?status= mantém o filtro aplicado", async () => {
    await abrir("?status=Vendido");

    expect(screen.getByRole("combobox", { name: /filtrar por status/i })).toHaveValue("Vendido");
    expect(cartoes()).toEqual(["Lote Recria 23"]);
  });

  it("escolher um filtro grava o valor na URL", async () => {
    const { user, router } = await abrir();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filtrar por origem/i }),
      "Nascimento",
    );

    expect(new URLSearchParams(router.state.location.search).get("origem")).toBe("Nascimento");
    expect(cartoes()).toEqual(["Lote Bezerros Sul", "Lote Descarte 22"]);
  });

  it.each([
    ["?modo=Individual", ["Boi 047"]],
    ["?pasto=Piquete%203", ["Boi 047", "Lote Safra 24"]],
    ["?origem=Aquisi%C3%A7%C3%A3o&status=Em%20produ%C3%A7%C3%A3o", []],
    ["?periodo=Este%20ano&inativos=1", ["Lote Teste 21"]],
  ])("%s filtra os registros", async (query, esperado) => {
    await abrir(query);

    expect(cartoes()).toEqual(esperado);
    if (esperado.length === 0) {
      expect(screen.getByRole("heading", { name: /nenhum resultado para o filtro/i })).toBeInTheDocument();
    }
  });

  it("Mostrar inativos revela o Lote Teste 21 com o selo Inativo", async () => {
    const { user, router } = await abrir();

    await user.click(screen.getByRole("checkbox", { name: /mostrar inativos/i }));

    expect(new URLSearchParams(router.state.location.search).get("inativos")).toBe("1");
    const teste = cartao("Lote Teste 21");
    expect(teste.getByText("Inativo")).toBeInTheDocument();
    expect(teste.getByRole("button", { name: /reativar/i })).toBeInTheDocument();
  });

  it("Limpar filtros volta a mostrar todos os registros", async () => {
    const { user, router } = await abrir("?status=Vendido&modo=Lote");

    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));

    expect(router.state.location.search).toBe("");
    expect(cartoes()).toHaveLength(5);
  });
});
