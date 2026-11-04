/**
 * Contratos de fronteira: cada feature deve expor aqui somente os tipos que
 * trafegam pela API. Tipos de formulário e estado de tela ficam na feature.
 */
export type ApiHealth = { status: "ok" };

export type PageResult<T> = {
  items: T[];
  total: number;
};
