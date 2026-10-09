// A protected API request returning 401 means the cookie session has expired.
// Public signup/login failures must remain in their own forms.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, init);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const url = input instanceof Request ? input.url : String(input);
  const sameOriginApi = typeof window !== "undefined" && window.location?.origin && url.startsWith(`${window.location.origin}/api/`);
  const protectedApi = (url.startsWith("/api/") || sameOriginApi) && headers.has("Authorization");
  if (response.status === 401 && protectedApi && typeof window !== "undefined") {
    window.dispatchEvent(new Event("andrade-session-expired"));
  }
  return response;
}
