// Caminho relativo: o Vite (e, na implantação, o proxy reverso) leva /api até a API (ADR 0001).
const apiUrl = import.meta.env.VITE_API_URL ?? "/api/v1";

export const env = {
  apiUrl: apiUrl.replace(/\/$/, ""),
};
