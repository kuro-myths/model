const BASE_URL = (process.env.MAX_ROUTER_BASE_URL || "https://max-router.vercel.app").replace(/\/+$/, "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const action = body.action;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  const routes = {
    models: { method: "GET", path: "/api/v1/models/image" },
    generate: { method: "POST", path: "/api/v1/images/generations" }
  };
  const route = routes[action];
  if (!route) return res.status(400).json({ error: "Unsupported Max Router action" });

  const headers = { Accept: "application/json" };
  if (apiKey) headers.Authorization = "Bearer " + apiKey;

  const options = { method: route.method, headers };
  if (action === "generate") {
    if (!body.request || typeof body.request.prompt !== "string" || !body.request.prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    if (!body.request.model) return res.status(400).json({ error: "Image model is required" });
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body.request);
  }

  try {
    const upstream = await fetch(BASE_URL + route.path, { ...options, signal: AbortSignal.timeout(55000) });
    const payload = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(payload);
  } catch (error) {
    return res.status(502).json({
      error: "Max Router tidak dapat dijangkau",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}