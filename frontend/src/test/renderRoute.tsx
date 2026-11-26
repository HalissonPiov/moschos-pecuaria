import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "@/app/routes";
import type { Usuario } from "@/shared/api/contracts";
import { BackendDataProvider } from "@/shared/demo/backend-data";
import { SessionProvider } from "@/features/auth/session";
import { usuarioDemo } from "@/test/fakes";

/**
 * Renderiza o app inteiro a partir de uma rota, com as mesmas rotas e os mesmos provedores
 * de main.tsx. Por padrão a sessão já está aberta com o usuário de demonstração; passe
 * `{ usuario: null }` para abrir sem sessão. Devolve o router para conferir a navegação.
 */
export function renderRoute(path: string, { usuario = usuarioDemo }: { usuario?: Usuario | null } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <SessionProvider usuarioInicial={usuario}>
      <BackendDataProvider>
        <MotionConfig reducedMotion="always">
          <RouterProvider router={router} />
        </MotionConfig>
      </BackendDataProvider>
    </SessionProvider>,
  );
  return { ...view, router, user, pathname: () => router.state.location.pathname };
}
