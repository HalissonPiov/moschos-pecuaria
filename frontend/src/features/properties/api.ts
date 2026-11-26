import { apiClient } from "@/shared/api/client";
import type {
  NovaPropriedadeApi,
  PropriedadeApi,
  PropriedadeCriadaApi,
} from "@/shared/api/contracts";

/** A propriedade no front-end: o id vira texto porque vem e vai pela rota. */
export type Propriedade = Omit<PropriedadeApi, "id"> & { id: string };
export type PropriedadeCriada = Propriedade & { categorias_criadas: string[] };

function doApi<T extends PropriedadeApi>(propriedade: T): Omit<T, "id"> & { id: string } {
  return { ...propriedade, id: String(propriedade.id) };
}

export async function listarPropriedades(): Promise<Propriedade[]> {
  const lista = await apiClient<PropriedadeApi[]>("/properties");
  return lista.map(doApi);
}

export async function obterPropriedade(id: string): Promise<Propriedade> {
  return doApi(await apiClient<PropriedadeApi>(`/properties/${encodeURIComponent(id)}`));
}

export async function cadastrarPropriedade(dados: NovaPropriedadeApi): Promise<PropriedadeCriada> {
  return doApi(
    await apiClient<PropriedadeCriadaApi>("/properties", { method: "POST", body: dados }),
  );
}
