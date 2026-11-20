import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Field, StateView } from "./UI";

describe("Field", () => {
  it("associa o rótulo ao campo e aceita digitação", async () => {
    render(<Field label="Identificação do lote" name="identificacao" />);

    const campo = screen.getByLabelText("Identificação do lote");
    await userEvent.type(campo, "Lote 1");

    expect(campo).toHaveValue("Lote 1");
    expect(campo).toHaveAttribute("aria-invalid", "false");
  });

  it("marca o campo como inválido e liga a mensagem de erro a ele", () => {
    render(<Field label="Valor" name="valor" error="Informe um valor maior que zero." />);

    const campo = screen.getByLabelText("Valor");

    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Informe um valor maior que zero.");
  });
});

describe("StateView", () => {
  it("no estado de erro, oferece tentar de novo", async () => {
    const onRetry = vi.fn();
    render(<StateView type="error" onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("no carregamento, anuncia o estado para leitores de tela", () => {
    render(<StateView type="loading" />);

    expect(screen.getByRole("status")).toHaveTextContent("Buscando seus dados...");
  });
});
