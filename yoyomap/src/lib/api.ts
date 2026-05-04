export function apiUrl(path: string): string {
  const apiBase = import.meta.env?.VITE_API_URL ?? "";
  return `${apiBase}${path}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
