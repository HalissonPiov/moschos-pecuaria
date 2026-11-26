import { describe, expect, it, vi } from "vitest";

vi.unmock("@/features/properties/api");
const { cadastrarPropriedade, listarPropriedades, obterPropriedade } = await import("./api");

const daApi = {
  id: 12,
  nome: "Fazenda da Baixada",
  municipio: "Piedade de Ponte Nova",
  uf: "MG",
  area_hectares: "70.00",
  titular_nome: "João Batista",
  titularidade: "confirmada",
  papel: "proprietario",
  aceite_declaracao_em: "2026-11-22T12:00:00Z",
  versao_termo: "1.0",
  rendimento_carcaca_pct: "50.00",
  praca_padrao: "Minas Gerais",
  dias_alerta_vencimento: 7,
};

describe("adaptador de propriedades", () => {
  it("lista as propriedades com o id como texto, para usar na rota", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([daApi]));

    const [propriedade] = await listarPropriedades();

    expect(propriedade.id).toBe("12");
    expect(propriedade.area_hectares).toBe("70.00");
  });

  it("consulta a propriedade pelo id da rota, sem deixar o texto mudar o caminho", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(daApi));

    await obterPropriedade("12/../outra");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/properties/12%2F..%2Foutra");
  });

  it("cadastra com POST e devolve as categorias criadas", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ ...daApi, categorias_criadas: ["Alimentação"] }, { status: 201 }),
      );

    const criada = await cadastrarPropriedade({
      nome: "Fazenda da Baixada",
      municipio: "Piedade de Ponte Nova",
      uf: "MG",
      area_hectares: "70.00",
      titular_nome: "João Batista",
      papel: "proprietario",
      aceite_termo: true,
      versao_termo: "1.0",
    });

    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(criada).toMatchObject({ id: "12", categorias_criadas: ["Alimentação"] });
  });
});
