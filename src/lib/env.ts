/**
 * Universal environment variable resolver supporting:
 * 1. Node.js / Next.js process.env (build-time inlined & server)
 * 2. Cloudflare Pages edge runtime getRequestContext().env
 * 3. Cloudflare Workers globalThis bindings
 */
export function getEnvVar(key: string): string {
  // 1. Standard process.env
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key]!;
  }
  // 2. Cloudflare Pages edge runtime getRequestContext().env (safely resolved dynamically)
  try {
    const req = typeof eval !== "undefined" ? eval("require") : null;
    if (req) {
      const nextOnPages = req("@cloudflare/next-on-pages");
      const ctx = nextOnPages?.getRequestContext?.();
      if (ctx && ctx.env && ctx.env[key]) {
        return String(ctx.env[key]);
      }
    }
  } catch {}
  // 3. globalThis bindings (Cloudflare edge isolate global scope)
  if (typeof globalThis !== "undefined") {
    if ((globalThis as any)[key]) {
      return String((globalThis as any)[key]);
    }
    if ((globalThis as any).env && (globalThis as any).env[key]) {
      return String((globalThis as any).env[key]);
    }
  }
  return "";
}
