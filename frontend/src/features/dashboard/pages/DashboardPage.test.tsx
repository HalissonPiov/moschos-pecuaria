import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

const base = "/fazenda/baixada";

async function abrirResumo() {
  const view = renderRoute(`${base}/resumo`);
  await screen.findByRole("heading", { level: 1, name: "Bom dia, João." });
  return view;
}

describe("Resumo da propriedade", () => {
  it("mostra cabeças em estoque, custo acumulado e custos do mês", async () => {
    await abrirResumo();
    const indicadores = screen.getByRole("region", { name: "Indicadores principais" });

    expect(indicadores).toHaveTextContent("Cabeças em estoque54");
    expect(indicadores).toHaveTextContent("Custo acumuladoR$ 122.372,48");
    expect(indicadores).toHaveTextContent("Custos do mêsR$ 2.184,70");
    expect(indicadores).toHaveTextContent("confirmados em novembro · 1 lançamento");
  });

  it("lotes por status levam ao Rebanho já filtrado", async () => {
    const { user, router, pathname } = await abrirResumo();

    for (const status of ["Em produção", "Pronto para venda", "Parcialmente vendido", "Vendido", "Encerrado"]) {
      expect(
        screen.getByRole("button", { name: `1 registro em ${status}. Ver no Rebanho` }),
      ).toBeInTheDocument();
    }

    await user.click(
      screen.getByRole("button", { name: "1 registro em Parcialmente vendido. Ver no Rebanho" }),
    );

    expect(pathname()).toBe(`${base}/rebanho`);
    expect(new URLSearchParams(router.state.location.search).get("status")).toBe(
      "Parcialmente vendido",
    );
  });

  it("alerta que o Boi 047 dá prejuízo de R$ 27,50 / @ na cotação atual", async () => {
    await abrirResumo();

    const boi = screen.getByRole("button", { name: /^Boi 047/ });
    expect(boi).toHaveTextContent(
      "R$ 27,50 / @ acima da cotação de R$ 318,00 / @: vender agora dá prejuízo",
    );
  });

  it("lista os próximos vencimentos e permite marcar como pago", async () => {
    const { user } = await abrirResumo();
    const vencimentos = screen
      .getByRole("heading", { name: "Próximos vencimentos" })
      .closest("section")!;

    expect(vencimentos).toHaveTextContent("Vencida em 10/11, há 10 dias · R$ 3.250,00");
    expect(vencimentos).toHaveTextContent("Vencida em 18/11, há 2 dias · R$ 786,45");

    await user.click(within(vencimentos).getAllByRole("button", { name: "Marcar como pago" })[0]);

    expect(
      await screen.findByText("Conta marcada como paga. O custo acumulado não mudou."),
    ).toBeInTheDocument();
    expect(within(vencimentos).getByRole("button", { name: "Paga" })).toBeDisabled();
  });

  it("cotação de referência com mais de 7 dias aparece como desatualizada", async () => {
    await abrirResumo();

    expect(screen.getByText("Pode estar desatualizada")).toBeInTheDocument();
    expect(screen.getByText("Esta cotação tem mais de 7 dias.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar cotação de hoje" })).toBeInTheDocument();
  });

  it("\"Como calculamos\" explica o custo por cabeça com o exemplo de 10 animais", async () => {
    const { user } = await abrirResumo();

    await user.click(screen.getByRole("button", { name: "Como calculamos a margem" }));

    const ajuda = await screen.findByRole("dialog", { name: "Como calculamos" });
    expect(ajuda).toHaveTextContent("Um lote de 10 cabeças gastou R$ 5.000,00");
    expect(ajuda).toHaveTextContent("R$ 600,00 por cabeça");
  });
});
