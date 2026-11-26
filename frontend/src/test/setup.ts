import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Com a suíte em paralelo e o cache frio, abrir uma rota pode passar de 1 s (o padrão).
configure({ asyncUtilTimeout: 3000 });

// As telas falam com a API só pelos adaptadores das features; nos testes eles são falsos.
vi.mock("@/features/auth/api", async () => (await import("./fakes")).fakeAuthApi());
vi.mock("@/features/properties/api", async () => (await import("./fakes")).fakePropertiesApi());

// O jsdom não implementa estas APIs de navegador usadas pelo Motion e pelas telas.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= ObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= ObserverStub as unknown as typeof IntersectionObserver;
window.scrollTo = () => {};
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
});
