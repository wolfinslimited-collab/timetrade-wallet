const TARGET = "https://rvdsnjufuybjzyqmpfgh.supabase.co/functions/v1/mobile-api";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const subPath = url.pathname
    .replace(/^\/functions\/v1\/mobile-api/, "")
    .replace(/^\/mobile-api/, "");
  const target = TARGET + subPath + url.search;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("apikey", "sb_publishable_fa7W-6qHZwqC1g0VIDaKmQ_JCU1HJgI");
  headers.set("authorization", "Bearer sb_publishable_fa7W-6qHZwqC1g0VIDaKmQ_JCU1HJgI");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const init: RequestInit = { method: req.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(req.method)) init.body = await req.arrayBuffer();

  const res = await fetch(target, init);
  const resHeaders = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) resHeaders.set(k, v);
  return new Response(res.body, { status: res.status, headers: resHeaders });
});
