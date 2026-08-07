export const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";

export type OllamaInfo = {
  running: boolean;
  models: { name: string; size: number }[];
  model: string | null; // preferred default
};

export async function detectOllama(): Promise<OllamaInfo> {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { running: false, models: [], model: null };
    const data = (await res.json()) as {
      models?: { name: string; size?: number }[];
    };
    const models = (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size ?? 0,
    }));
    let model = process.env.OLLAMA_MODEL ?? null;
    if (!model) {
      // Prefer the largest Qwen build, then the largest anything.
      const bySize = [...models].sort((a, b) => b.size - a.size);
      model =
        (bySize.find((m) => m.name.toLowerCase().includes("qwen")) ?? bySize[0])
          ?.name ?? null;
    }
    return { running: true, models, model };
  } catch {
    return { running: false, models: [], model: null };
  }
}

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

// Streams plain text tokens from Ollama's NDJSON chat stream.
//
// `onDone` receives the full answer once the stream finishes, so the caller can
// persist it. It fires on cancel too — a half-written answer is still worth
// keeping, and the user pressing Stop shouldn't throw the reply away.
export async function streamChat(
  model: string,
  messages: ChatTurn[],
  onDone?: (answer: string) => void
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      think: false,
      keep_alive: "30m", // keep the model warm in RAM between questions
      options: { temperature: 0.3 },
      messages,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama returned ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let answer = "";
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone?.(answer);
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        finish();
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
          };
          const content = chunk.message?.content;
          if (content) {
            answer += content;
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // partial line noise — ignore
        }
      }
    },
    cancel() {
      finish();
      reader.cancel();
    },
  });
}
