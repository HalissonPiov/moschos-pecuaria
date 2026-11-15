# 0001. Autenticação com JWT de acesso e refresh token em cookie

Data: 2026-11-15
Status: aceito

## Contexto

O acesso exige login com e-mail e senha (RF01), logout (RF02), senha guardada com hash seguro e autenticação por token (RNF04). O público usa principalmente o celular, muitas vezes com conexão instável (RNF02, RNF10). Por isso, a sessão não pode cair a cada poucos minutos, mas um token roubado também não pode valer por muito tempo.

O front-end (Vite) e a API (FastAPI) rodam em portas diferentes no desenvolvimento.

## Decisão

- A senha é guardada com **Argon2id**, pela biblioteca `pwdlib`.
- O login devolve um **token de acesso JWT de curta duração** (15 minutos), que o front-end mantém só em memória e envia no cabeçalho `Authorization: Bearer`.
- O login também grava um **refresh token JWT** (7 dias) em cookie `HttpOnly`, `SameSite=Strict`, `Secure` fora do desenvolvimento e com `Path=/api/v1/auth`. `POST /auth/refresh` lê o cookie e devolve um novo token de acesso. `POST /auth/logout` apaga o cookie.
- Os tokens são assinados com `SECRET_KEY` (HS256), pela biblioteca `PyJWT`.
- No desenvolvimento, o Vite faz **proxy** de `/api` para `http://localhost:8000`, e `VITE_API_URL` passa a ser `/api/v1`. Assim o navegador vê front-end e API na mesma origem. Na implantação, a mesma origem é obtida com um proxy reverso (rewrite) na frente da API.

## Alternativas consideradas

- **Só um JWT longo no `localStorage`:** é simples, mas qualquer script injetado na página lê o token, e não há como encurtar a validade sem forçar novo login frequente.
- **Sessão no servidor com cookie de sessão:** permite revogar a sessão na hora, mas exige uma tabela ou cache de sessões e proteção contra CSRF em todas as rotas. Além disso, foge do "autenticação por token" pedido no RNF04.
- **Refresh token opaco gravado no banco:** permite revogar e fazer rotação de tokens, mas exige uma tabela nova no modelo. Fica como evolução (ver Consequências).
- **CORS com credenciais entre origens:** funcionaria sem proxy, mas exige `SameSite=None` e cuidado extra com CSRF. O proxy evita esse problema.

## Consequências

- Um token de acesso vazado vale no máximo 15 minutos, e o refresh token não fica acessível a JavaScript.
- Como o cookie é `SameSite=Strict` e só é enviado para `/api/v1/auth`, uma página de outro site não consegue usá-lo para chamar a API.
- **Limitação aceita:** o refresh token não é gravado no banco. Por isso o logout não invalida um refresh token já copiado, que continua valendo até expirar. Se for preciso revogar sessões (por exemplo, ao remover um membro, RN37), criar uma tabela de refresh tokens com hash, como já é feito em `recuperacao_senha`.
- A remoção de um membro tem efeito imediato mesmo assim, porque toda rota confere o vínculo com a propriedade a cada requisição (ADR 0002).
- A fazer no pacote 3: dependências `pwdlib[argon2]` e `PyJWT`; proxy em `vite.config.ts`; troca de `VITE_API_URL`; o cliente HTTP do front-end renova o token de acesso uma vez ao receber 401 e repete a requisição.
