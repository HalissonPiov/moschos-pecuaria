/**
 * As telas ainda usam dados de demonstração, preservados para manter o
 * protótipo navegável. Ao implementar cada caso de uso, a feature deve:
 * - declarar seus contratos em shared/api/contracts.ts;
 * - criar seu adaptador de endpoint em features/<domínio>/api;
 * - usar apiClient, sem chamar fetch diretamente em páginas ou componentes;
 * - trocar a leitura de shared/demo pela resposta da API e apagar o que sobrar.
 *
 * Onde estão os dados fictícios hoje:
 * - propriedades, lotes, compras, recorrências e vendas: shared/demo/data.ts,
 *   com a alocação de custo da RN17 em allocateSaleCost e computeSale;
 * - animais e pastos: shared/demo/livestock.ts;
 * - correções justificadas: em memória, em shared/demo/corrections.ts;
 * - cotações, cadastros, membros, convites e parâmetros: shared/demo/demo-backend.ts,
 *   entregues às telas por BackendDataProvider (shared/demo/backend-data.tsx).
 *
 * Fotos de notas serão enviadas pela API autenticada ao armazenamento privado.
 * Confirmação de e-mail, logo e capa da propriedade e as demais funções sem
 * suporte no modelo v2 ficam ocultas na integração (divergências M1 a M7).
 * OCR e cotações automáticas continuam fora do MVP.
 */
export const integrationNotes = true
