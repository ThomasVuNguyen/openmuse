// Cloudflare Workers AI OpenAI-compatible endpoint compatibility shim:
// Cloudflare's schema validator requires message.content to be a string (rejects null on assistant tool call messages).
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as any)?.url;
  if (
    url &&
    typeof url === "string" &&
    url.includes("api.cloudflare.com") &&
    init?.body &&
    typeof init.body === "string"
  ) {
    try {
      const data = JSON.parse(init.body);
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (msg.content === null || msg.content === undefined) {
            msg.content = "";
          }
        }
        init = { ...init, body: JSON.stringify(data) };
      }
    } catch {}
  }
  return originalFetch(input, init);
};
