import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "@/test/renderRoute";

type Usuario = ReturnType<typeof renderRoute>["user"];

/**
 * Preenche um campo de uma vez (clicar e colar). Digitar tecla a tecla é instável nesta tela
 * quando a suíte roda em paralelo: parte dos caracteres se perde.
 */
async function preencher(user: Usuario, campo: HTMLElement, texto: string) {
  await user.click(campo);
  await user.paste(texto);
}

async function preencherLogin(user: Usuario) {
  await preencher(user, screen.getByLabelText("E-mail"), "joao@fazendadabaixada.com.br");
  await preencher(user, screen.getByLabelText("Senha"), "senha-segura");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("tela de acesso", () => {
  it("mostra os erros de e-mail e senha ao enviar vazio", async () => {
    const { user, pathname } = renderRoute("/entrar");

    await user.click(await screen.findByRole("button", { name: "Entrar" }));

    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(
      /informe um e-mail válido/i,
    );
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription(
      /pelo menos 8 caracteres/i,
    );
    expect(pathname()).toBe("/entrar");
  });

  it("login válido leva para Minhas propriedades", async () => {
    const { user, pathname } = renderRoute("/entrar");
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });

    await preencherLogin(user);

    expect(await screen.findByRole("heading", { name: /minhas propriedades/i })).toBeInTheDocument();
    expect(pathname()).toBe("/propriedades");
  });

  it("com uma só propriedade, o login vai direto ao Resumo", async () => {
    const { user, pathname } = renderRoute("/entrar?propriedades=1");
    await screen.findByRole("heading", { name: /entre na sua fazenda/i });

    await preencherLogin(user);

    expect(await screen.findByRole("heading", { level: 1, name: /bom dia, joão/i })).toBeInTheDocument();
    expect(pathname()).toBe("/fazenda/baixada/resumo");
  });

  it("a aba Criar conta pede nome e confirmação de senha", async () => {
    const { user } = renderRoute("/entrar");

    await user.click(await screen.findByRole("tab", { name: "Criar conta" }));

    expect(screen.getByRole("tab", { name: "Criar conta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: /comece a cuidar dos números/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirme a senha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Criar minha conta" }));
    expect(screen.getByLabelText("Seu nome")).toHaveAccessibleDescription(/informe seu nome/i);
    expect(screen.getByLabelText("Confirme a senha")).toHaveAccessibleDescription(
      /repita a senha/i,
    );
  });

  it("criar conta válida leva à confirmação de e-mail", async () => {
    const { user } = renderRoute("/entrar?modo=cadastro");

    await preencher(user, await screen.findByLabelText("Seu nome"), "Maria");
    await preencher(user, screen.getByLabelText("E-mail"), "maria@exemplo.com");
    await preencher(user, screen.getByLabelText("Senha"), "Senha-Forte-1");
    await preencher(user, screen.getByLabelText("Confirme a senha"), "Senha-Forte-1");
    await user.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByRole("heading", { name: /confirme seu e-mail/i })).toBeInTheDocument();
    expect(screen.getByText(/enviamos um link para maria@exemplo\.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar em \d+s/i })).toBeDisabled();
  });

  it("link de confirmação expirado oferece um novo link", async () => {
    const { user } = renderRoute("/entrar?tela=confirm-expired");

    expect(
      await screen.findByRole("heading", { name: /link de confirmação expirado/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar novo link" }));
    expect(await screen.findByRole("heading", { name: /confirme seu e-mail/i })).toBeInTheDocument();
  });

  it("e-mail confirmado leva às propriedades em estado vazio", async () => {
    const { user, router } = renderRoute("/entrar?tela=confirmed");

    await user.click(await screen.findByRole("button", { name: /ir para minhas propriedades/i }));

    expect(
      await screen.findByRole("heading", { name: /cadastre sua primeira propriedade/i }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("?estado=empty");
  });

  it("recuperar senha valida o e-mail e confirma o envio", async () => {
    const { user } = renderRoute("/entrar");

    await user.click(await screen.findByRole("button", { name: "Esqueci minha senha" }));
    expect(screen.getByRole("heading", { name: "Recuperar senha" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /enviar link de recuperação/i }));
    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(/informe um e-mail válido/i);

    await preencher(user, screen.getByLabelText("E-mail"), "joao@exemplo.com");
    await user.click(screen.getByRole("button", { name: /enviar link de recuperação/i }));
    expect(await screen.findByRole("heading", { name: /confira seu e-mail/i })).toBeInTheDocument();
    expect(screen.getByText(/joao@exemplo\.com/)).toBeInTheDocument();
  });

  it("criar nova senha exige senhas iguais e volta ao login com aviso", async () => {
    const { user } = renderRoute("/entrar?tela=new-password");

    expect(await screen.findByRole("heading", { name: "Criar nova senha" })).toBeInTheDocument();
    await preencher(user, screen.getByLabelText("Nova senha"), "Senha-Nova-1");
    await preencher(user, screen.getByLabelText("Confirmar nova senha"), "Outra-Senha-2");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveAccessibleDescription(
      /as senhas precisam ser iguais/i,
    );

    await user.clear(screen.getByLabelText("Confirmar nova senha"));
    await preencher(user, screen.getByLabelText("Confirmar nova senha"), "Senha-Nova-1");
    await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));

    expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/senha criada/i);
  });

  it("link de recuperação inválido permite pedir outro", async () => {
    const { user } = renderRoute("/entrar?tela=reset-invalid");

    expect(
      await screen.findByRole("heading", { name: /link inválido ou expirado/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar novo link" }));
    expect(screen.getByRole("heading", { name: "Recuperar senha" })).toBeInTheDocument();
  });

  it("mostra o erro de login e o aviso de saída pelos parâmetros de demonstração", async () => {
    renderRoute("/entrar?erro=login&saiu=1");

    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível entrar/i);
    expect(screen.getByRole("status")).toHaveTextContent(/você saiu da sua conta/i);
  });
});
