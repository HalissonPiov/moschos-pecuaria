import { afterEach, beforeEach } from "vitest";
import { recursos, type Recurso } from "@/shared/config/recursos";

/**
 * Liga funções ocultas (shared/config/recursos.ts) nos testes do describe em que for chamada.
 * Serve para manter testados os fluxos do protótipo que voltam quando o pacote deles
 * for integrado. Depois de cada teste, os valores originais voltam.
 */
export function comRecursos(...nomes: Recurso[]) {
  const originais = { ...recursos };
  beforeEach(() => {
    nomes.forEach((nome) => {
      recursos[nome] = true;
    });
  });
  afterEach(() => {
    Object.assign(recursos, originais);
  });
}
