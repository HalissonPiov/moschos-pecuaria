import { describe, expect, it } from "vitest";
import { recursos } from "./recursos";

describe("recursos da v1.0 (risco R13)", () => {
  it("nenhuma função adiada ou de pacote não integrado vem ligada", () => {
    const ligados = Object.entries(recursos).filter(([, ligado]) => ligado);

    expect(ligados).toEqual([]);
  });
});
