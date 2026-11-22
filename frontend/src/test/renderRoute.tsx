import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "@/app/routes";
import { BackendDataProvider } from "@/shared/demo/backend-data";

/**
 * Renderiza o app inteiro a partir de uma rota, com as mesmas rotas e o mesmo
 * provedor de dados de main.tsx. Devolve o router para conferir a navegação.
 */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(
    <BackendDataProvider>
      <MotionConfig reducedMotion="always">
        <RouterProvider router={router} />
      </MotionConfig>
    </BackendDataProvider>,
  );
  return { ...view, router, user, pathname: () => router.state.location.pathname };
}
