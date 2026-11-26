import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { criarConta, entrar } from "@/features/auth/api";
import { listarPropriedades } from "@/features/properties/api";
import { demoParaPropriedade } from "@/test/fakes";
import { comRecursos } from "@/test/recursos";
import { renderRoute } from "@/test/renderRoute";
import { properties } from "@/shared/demo/data";

type Usuario = ReturnType<typeof renderRoute>["user"];

/** A tela de acesso é aberta sem sessão. */
function abrir(path = "/entrar") {
  return renderRoute(path, { usuario: null });
}

/**
 * Preenche um campo de uma vez (clicar e colar). Digitar tecla a tecla é instável nesta tela
 * quando a suíte roda em paralelo: parte dos caracteres se perde.
 */
async function preencher(user: Usuario, campo: HTMLElement, texto: string) {
  await user.click(campo);
  await user.paste(texto);
}

async function preencherLogin(user: Usuario) {
  await preencher(user, await screen.findByLabelText("E-mail"), "joao@fazendadabaixada.com.br");
  await preencher(user, screen.getByLabelText("Senha"), "senha-segura");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

async function preencherCadastro(user: Usuario) {
  await preencher(user, await screen.findByLabelText("Seu nome"), "Maria");
  await preencher(user, screen.getByLabelText("E-mail"), "maria@exemplo.com");
  await preencher(user, screen.getByLabelText("Senha"), "Senha-Forte-1");
  await preencher(user, screen.getByLabelText("Confirme a senha"), "Senha-Forte-1");
  await user.click(screen.getByRole("button", { name: "Criar minha conta" }));
}

describe("tela de acesso · entrar", () => {
  it("mostra os erros de e-mail e senha ao enviar vazio, sem chamar a API", async () => {
    const { user, pathname } = abrir();

    await user.click(await screen.findByRole("button", { name: "Entrar" }));

    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(
      /informe um e-mail válido/i,
    );
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription(
      /pelo menos 8 caracteres/i,
    );
    expect(entrar).not.toHaveBeenCalled();
    expect(pathname()).toBe("/entrar");
  });

  it("login válido envia as credenciais e leva para Minhas propriedades", async () => {
    const { user, pathname } = abrir();

    await preencherLogin(user);

    expect(await screen.findByRole("heading", { name: /minhas propriedades/i })).toBeInTheDocument();
    expect(pathname()).toBe("/propriedades");
    expect(entrar).toHaveBeenCalledWith({
      email: "joao@fazendadabaixada.com.br",
      senha: "senha-segura",
    });
  });

  it("com uma só propriedade, o login vai direto ao Resumo dela (RF01)", async () => {
    vi.mocked(listarPropriedades).mockResolvedValueOnce([demoParaPropriedade(properties.baixada)]);
    const { user, pathname } = abrir();

    await preencherLogin(user);

    expect(await screen.findByRole("heading", { level: 1, name: /bom dia, joão/i })).toBeInTheDocument();
    expect(pathname()).toBe("/fazenda/baixada/resumo");
  });

  it("e-mail ou senha errados mostram o aviso e mantêm a tela", async () => {
    vi.mocked(entrar).mockRejectedValueOnce(new ApiError("E-mail ou senha incorretos.", 401));
    const { user, pathname } = abrir();

    await preencherLogin(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não foi possível entrar.*confira o e-mail e a senha/i,
    );
    expect(pathname()).toBe("/entrar");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("sem conexão, o aviso diz para conferir a internet", async () => {
    vi.mocked(entrar).mockRejectedValueOnce(new ApiError("Sem conexão.", 0));
    const { user } = abrir();

    await preencherLogin(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/confira a internet/i);
  });

  it("erro inesperado do servidor não mostra a mensagem técnica", async () => {
    vi.mocked(entrar).mockRejectedValueOnce(new ApiError("Not Found", 404));
    const { user } = abrir();

    await preencherLogin(user);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/o servidor não respondeu como esperado/i);
    expect(alerta).not.toHaveTextContent("Not Found");
  });

  it("rota privada sem sessão leva ao login e, depois de entrar, volta para ela", async () => {
    const { user, pathname } = abrir("/fazenda/baixada/rebanho");

    expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    expect(pathname()).toBe("/entrar");

    await preencherLogin(user);

    expect(await screen.findByRole("heading", { level: 1, name: /^rebanho$/i })).toBeInTheDocument();
    expect(pathname()).toBe("/fazenda/baixada/rebanho");
  });

  it("quem já tem sessão e abre /entrar vai para as propriedades", async () => {
    const { pathname } = renderRoute("/entrar");

    expect(await screen.findByRole("heading", { name: /minhas propriedades/i })).toBeInTheDocument();
    expect(pathname()).toBe("/propriedades");
  });

  it("mostra o aviso de saída", async () => {
    abrir("/entrar?saiu=1");

    expect(await screen.findByRole("status")).toHaveTextContent(/você saiu da sua conta/i);
  });
});

describe("tela de acesso · criar conta", () => {
  it("a aba Criar conta pede nome e confirmação de senha", async () => {
    const { user } = abrir();

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
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("criar conta válida abre a sessão e vai direto para Minhas propriedades (sem M1)", async () => {
    const { user, pathname } = abrir("/entrar?modo=cadastro");

    await preencherCadastro(user);

    expect(await screen.findByRole("heading", { name: /minhas propriedades/i })).toBeInTheDocument();
    expect(pathname()).toBe("/propriedades");
    expect(criarConta).toHaveBeenCalledWith({
      nome: "Maria",
      email: "maria@exemplo.com",
      senha: "Senha-Forte-1",
    });
    expect(screen.queryByText(/confirme seu e-mail/i)).not.toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("e-mail já cadastrado aparece no campo de e-mail", async () => {
    vi.mocked(criarConta).mockRejectedValueOnce(
      new ApiError("Já existe uma conta com este e-mail. Entre ou use outro e-mail.", 409),
    );
    const { user, pathname } = abrir("/entrar?modo=cadastro");

    await preencherCadastro(user);

    expect(await screen.findByLabelText("E-mail")).toHaveAccessibleDescription(
      /já existe uma conta com este e-mail/i,
    );
    expect(pathname()).toBe("/entrar");
  });
});

describe("tela de acesso · funções ocultas na v1.0", () => {
  it("não oferece recuperação de senha (C4)", async () => {
    abrir();

    await screen.findByRole("button", { name: "Entrar" });
    expect(screen.queryByRole("button", { name: "Esqueci minha senha" })).not.toBeInTheDocument();
  });

  it.each(["confirm", "confirmed", "recover", "new-password"])(
    "?tela=%s abre o formulário de acesso",
    async (tela) => {
      abrir(`/entrar?tela=${tela}`);

      expect(await screen.findByRole("heading", { name: /entre na sua fazenda/i })).toBeInTheDocument();
    },
  );
});

describe("tela de acesso · confirmação de e-mail (M1, quando religada)", () => {
  comRecursos("confirmacaoDeEmail");

  it("criar conta válida leva à confirmação de e-mail", async () => {
    const { user } = abrir("/entrar?modo=cadastro");

    await preencherCadastro(user);

    expect(await screen.findByRole("heading", { name: /confirme seu e-mail/i })).toBeInTheDocument();
    expect(screen.getByText(/enviamos um link para maria@exemplo\.com/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar em \d+s/i })).toBeDisabled();
  });

  it("link de confirmação expirado oferece um novo link", async () => {
    const { user } = abrir("/entrar?tela=confirm-expired");

    expect(
      await screen.findByRole("heading", { name: /link de confirmação expirado/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar novo link" }));
    expect(await screen.findByRole("heading", { name: /confirme seu e-mail/i })).toBeInTheDocument();
  });
});

describe("tela de acesso · recuperação de senha (C4, quando religada)", () => {
  comRecursos("recuperacaoDeSenha");

  it("recuperar senha valida o e-mail e confirma o envio", async () => {
    const { user } = abrir();

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
    const { user } = abrir("/entrar?tela=new-password");

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
    const { user } = abrir("/entrar?tela=reset-invalid");

    expect(
      await screen.findByRole("heading", { name: /link inválido ou expirado/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enviar novo link" }));
    expect(screen.getByRole("heading", { name: "Recuperar senha" })).toBeInTheDocument();
  });
});
