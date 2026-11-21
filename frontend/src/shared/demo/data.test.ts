import { describe, expect, it } from "vitest";
import {
  allocateSaleCost,
  arrobasFromLiveWeight,
  computeSale,
  getRecord,
  propertyTotals,
  recordEndDate,
  recordsForProperty,
  reportPeriodRange,
  reportRowsFor,
  round2,
  sales,
} from "./data";

describe("conversão para arroba (RN18)", () => {
  it("converte peso vivo com o rendimento padrão de 50%", () => {
    expect(round2(arrobasFromLiveWeight(3640))).toBe(121.33);
  });

  it("aceita outro rendimento de carcaça", () => {
    expect(round2(arrobasFromLiveWeight(450, 52))).toBe(15.6);
  });
});

describe("custo alocado na venda (RN17, custo médio móvel)", () => {
  it("reproduz o exemplo do documento: 10 cabeças, R$ 5.000, venda de 3", () => {
    expect(allocateSaleCost(5000, 10, 3)).toBe(1500);
  });

  it("depois de mais R$ 700, o custo por cabeça do saldo vira R$ 600", () => {
    const saldo = 5000 - allocateSaleCost(5000, 10, 3) + 700;
    expect(saldo / 7).toBe(600);
  });

  it("arredonda só no fim (Lote Safra 24, venda de 28/10)", () => {
    expect(allocateSaleCost(82067.14, 38, 7)).toBe(15117.63);
  });

  it("a venda que zera o saldo leva todo o custo restante", () => {
    expect(allocateSaleCost(1000.005, 3, 3)).toBe(1000.01);
  });

  it("não aloca nada sem cabeças", () => {
    expect(allocateSaleCost(1000, 0, 3)).toBe(0);
    expect(allocateSaleCost(1000, 3, 0)).toBe(0);
  });
});

describe("resultado da venda (RN19 a RN25)", () => {
  const venda = computeSale({
    unallocatedCostAtDate: 82067.14,
    headsBeforeSale: 38,
    headsSold: 7,
    arrobas: arrobasFromLiveWeight(3640),
    pricePerArroba: 312,
    expenses: 1236,
  });

  it("calcula a receita com as arrobas arredondadas a 2 casas", () => {
    expect(venda.arrobas).toBe(121.33);
    expect(venda.revenue).toBe(37854.96);
  });

  it("calcula custo alocado, margens e ponto de equilíbrio", () => {
    expect(venda.allocatedCost).toBe(15117.63);
    expect(venda.grossMargin).toBe(22737.33);
    expect(venda.netMargin).toBe(21501.33);
    expect(venda.breakEven).toBe(134.79);
  });
});

describe("dados de demonstração coerentes", () => {
  it("a venda de 28/10 registrada bate com o cálculo", () => {
    const venda = sales.find((s) => s.id === "venda-safra-24-2026-10-28");
    expect(venda).toBeDefined();
    expect(venda?.allocatedCost).toBe(15117.63);
    expect(venda?.revenue).toBe(37854.96);
    expect(venda?.netMargin).toBe(21501.33);
  });

  it("o Lote Safra 24 tem 31 de 38 cabeças e R$ 84.251,84 de custo", () => {
    const lote = getRecord("lote-safra-24");
    expect(lote?.balance).toBe(31);
    expect(lote?.original).toBe(38);
    expect(lote?.accumulatedCost).toBe(84251.84);
  });

  it("os totais da Fazenda da Baixada somam 54 cabeças e R$ 122.372,48", () => {
    expect(propertyTotals.stockHeads).toBe(54);
    expect(propertyTotals.accumulatedCost).toBe(122372.48);
    expect(propertyTotals.salesRevenue).toBe(137884.62);
    expect(propertyTotals.salesNetMargin).toBe(61608.57);
  });

  it("registros inativos ficam fora da lista padrão", () => {
    const padrao = recordsForProperty("baixada").map((r) => r.slug);
    const todos = recordsForProperty("baixada", { includeInactive: true }).map((r) => r.slug);
    expect(padrao).not.toContain("lote-teste-21");
    expect(todos).toContain("lote-teste-21");
  });
});

describe("relatórios por período", () => {
  it("calcula o intervalo de cada período a partir de hoje (20/11/2026)", () => {
    const iso = (date: Date | null) => date && date.toLocaleDateString("pt-BR");
    const ano = reportPeriodRange("Este ano");
    expect([iso(ano.from), iso(ano.to)]).toEqual(["01/01/2026", "20/11/2026"]);
    const doze = reportPeriodRange("Últimos 12 meses");
    expect([iso(doze.from), iso(doze.to)]).toEqual(["21/11/2025", "20/11/2026"]);
    const passado = reportPeriodRange("Ano passado");
    expect([iso(passado.from), iso(passado.to)]).toEqual(["01/01/2025", "31/12/2025"]);
    expect(reportPeriodRange("Desde o início").from).toBeNull();
  });

  it("o fim do registro é a venda que zerou o saldo, a última baixa ou hoje", () => {
    expect(recordEndDate(getRecord("lote-recria-23")!)).toBe("03/06/2026");
    expect(recordEndDate(getRecord("lote-descarte-22")!)).toBe("14/09/2026");
    expect(recordEndDate(getRecord("lote-safra-24")!)).toBe("20/11/2026");
  });

  it("margens consideram só as vendas do período", () => {
    const esteAno = reportRowsFor("baixada", { type: "margens", period: "Este ano" });
    expect(esteAno.map((row) => row.slug)).toEqual(["lote-safra-24", "lote-recria-23"]);
    expect(esteAno[0]).toMatchObject({ netMargin: 21501.33, marginPartial: true });
    expect(esteAno[1].marginPartial).toBe(false);
    expect(reportRowsFor("baixada", { type: "margens", period: "Ano passado" })).toEqual([]);
  });

  it("custos consideram os registros que existiam no período e respeitam o filtro de lote", () => {
    expect(reportRowsFor("baixada", { type: "custos", period: "Ano passado" })).toHaveLength(5);
    expect(
      reportRowsFor("baixada", { type: "custos", period: "Este ano", lot: "boi-047" }).map((r) => r.slug),
    ).toEqual(["boi-047"]);
  });
});
