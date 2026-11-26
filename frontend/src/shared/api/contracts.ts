/**
 * Contratos de fronteira: cada feature deve expor aqui somente os tipos que
 * trafegam pela API. Tipos de formulário e estado de tela ficam na feature.
 */
export type ApiHealth = { status: "ok" };

export type PageResult<T> = {
  items: T[];
  total: number;
};

// Acesso (RF01, ADR 0001) -----------------------------------------------------------

export type Usuario = { id: number; nome: string; email: string };

export type Sessao = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  usuario: Usuario;
};

export type CadastroDeConta = { nome: string; email: string; senha: string };
export type Credenciais = { email: string; senha: string };

// Propriedades (RF32, RF33, RN35, RN36) -----------------------------------------------

export type PapelPropriedade = "proprietario" | "gestor";
export type Titularidade = "confirmada" | "declarada_por_gestor";

/** Valores decimais chegam como texto ("70.00") para não perder precisão. */
export type PropriedadeApi = {
  id: number;
  nome: string;
  municipio: string | null;
  uf: string | null;
  area_hectares: string | null;
  titular_nome: string;
  titularidade: Titularidade;
  papel: PapelPropriedade;
  aceite_declaracao_em: string;
  versao_termo: string;
  rendimento_carcaca_pct: string;
  praca_padrao: string;
  dias_alerta_vencimento: number;
};

export type PropriedadeCriadaApi = PropriedadeApi & { categorias_criadas: string[] };

export type NovaPropriedadeApi = {
  nome: string;
  municipio: string;
  uf: string;
  area_hectares: string | null;
  titular_nome: string;
  papel: PapelPropriedade;
  aceite_termo: true;
  versao_termo: string;
};
