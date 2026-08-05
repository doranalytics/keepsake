const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";

export async function detectOllama(): Promise<{
  available: boolean;
  model: string | null;
}> {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { available: false, model: null };
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = data.models ?? [];
    if (models.length === 0) return { available: false, model: null };
    const preferred =
      process.env.OLLAMA_MODEL ??
      (models.find((m) => m.name.toLowerCase().includes("qwen"))?.name ||
        models[0].name);
    return { available: true, model: preferred };
  } catch {
    return { available: false, model: null };
  }
}

// Streams plain text tokens from Ollama's NDJSON chat stream.
export async function streamChat(
  model: string,
  system: string,
  user: string
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      think: false,
      options: { temperature: 0.3 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama returned ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
          };
          const content = chunk.message?.content;
          if (content) controller.enqueue(encoder.encode(content));
        } catch {
          // partial line noise — ignore
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
