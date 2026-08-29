export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const downloads = {
      "/downloads/andrade-energy-gerador.apk": "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk",
      "/downloads/andrade-energy-consumidor.apk": "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-consumidor.apk",
    };
    const downloadUrl = downloads[requestUrl.pathname];
    if ((request.method === "GET" || request.method === "HEAD") && downloadUrl) {
      return Response.redirect(downloadUrl, 302);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") {
      if (request.method === "GET" && (requestUrl.pathname === "/" || response.headers.get("content-type")?.includes("text/html"))) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.delete("ETag");
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }
      return response;
    }
    requestUrl.pathname = "/";
    const fallback = await env.ASSETS.fetch(new Request(requestUrl, request));
    const headers = new Headers(fallback.headers);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.delete("ETag");
    return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers });
  },
};
