import { readApiServiceUrl } from "@/config";

export const dynamic = "force-dynamic";

export const GET = async (): Promise<Response> => {
  try {
    // Bindings exist in runtime functions, not during build or middleware execution.
    const base = readApiServiceUrl();
    base.pathname = `${base.pathname.replace(/\/$/, "")}/health`;
    base.search = "";
    base.hash = "";
    const response = await fetch(base, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "api_unavailable", message: "API health is temporarily unavailable." } }, { status: 503 });
  }
};
