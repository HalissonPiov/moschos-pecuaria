import { vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import type { NovaPropriedadeApi, Usuario } from "@/shared/api/contracts";
import { isPropertyId, listableProperties, properties, type PropertyInfo } from "@/shared/demo/data";
import type { Propriedade, PropriedadeCriada } from "@/features/properties/api";

/**
 * Adaptadores falsos usados por todos os testes de tela (registrados em setup.ts).
 * Devolvem as propriedades de demonstração no formato da API, com os mesmos ids (slugs),
 * para os cenários das telas que ainda não foram integradas continuarem valendo.
 * Cada teste pode trocar uma resposta com vi.mocked(...).mockResolvedValueOnce(...).
 */

export const usuarioDemo: Usuario = {
  id: 1,
  nome: "João Batista",
  email: "joao@fazendadabaixada.com.br",
};

export const CATEGORIAS_SUGERIDAS = ["Alimentação", "Sanidade", "Suplementos", "Locação", "Manutenção"];

export function demoParaPropriedade(info: PropertyInfo): Propriedade {
  const area = info.area.match(/^([\d.,]+)\s*ha$/)?.[1];
  return {
    id: info.id,
    nome: info.name,
    municipio: info.municipality,
    uf: info.uf,
    area_hectares: area ? Number(area.replace(/\./g, "").replace(",", ".")).toFixed(2) : null,
    titular_nome: info.owner,
    titularidade: info.confirmed ? "confirmada" : "declarada_por_gestor",
    papel: info.role === "Proprietário" ? "proprietario" : "gestor",
    aceite_declaracao_em: "2024-01-18T12:00:00Z",
    versao_termo: "1.0",
    rendimento_carcaca_pct: "50.00",
    praca_padrao: "Minas Gerais",
    dias_alerta_vencimento: 7,
  };
}

export function fakeAuthApi() {
  return {
    criarConta: vi.fn(async (dados: { nome: string; email: string }) => ({
      id: 2,
      nome: dados.nome,
      email: dados.email,
    })),
    entrar: vi.fn(async () => usuarioDemo),
    retomarSessao: vi.fn(async (): Promise<Usuario | null> => null),
    sair: vi.fn(async () => undefined),
  };
}

export function fakePropertiesApi() {
  return {
    listarPropriedades: vi.fn(async () => listableProperties.map(demoParaPropriedade)),
    obterPropriedade: vi.fn(async (id: string) => {
      if (!isPropertyId(id)) throw new ApiError("Propriedade não encontrada.", 404);
      return demoParaPropriedade(properties[id]);
    }),
    cadastrarPropriedade: vi.fn(
      async (dados: NovaPropriedadeApi): Promise<PropriedadeCriada> => ({
        ...demoParaPropriedade(properties["nova-propriedade"]),
        nome: dados.nome,
        municipio: dados.municipio,
        uf: dados.uf,
        area_hectares: dados.area_hectares,
        titular_nome: dados.titular_nome,
        papel: dados.papel,
        titularidade: dados.papel === "proprietario" ? "confirmada" : "declarada_por_gestor",
        categorias_criadas: CATEGORIAS_SUGERIDAS,
      }),
    ),
  };
}
