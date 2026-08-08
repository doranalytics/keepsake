import Anthropic from "@anthropic-ai/sdk";
import { getSetting, setSetting } from "@/lib/vault";

// Claude Haiku 4.5 does this job for a fifth of a cent a question. It was
// chosen over the bigger models deliberately: decoding slang and reading tone
// is a knowledge-and-context task, not a hard reasoning one, and the thing
// that actually decides answer quality here is how many surrounding messages
// we send — not how large the model is.
export const MODEL = "claude-haiku-4-5";

const KEY_SETTING = "anthropic_api_key";

// The key lives in the vault so it survives app updates and re-syncs. Reading
// it through one accessor is what makes a hosted/credits proxy a later swap
// rather than a rewrite — only this function has to change.
export function getApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? getSetting(KEY_SETTING);
}

export function setApiKey(key: string | null): void {
  setSetting(KEY_SETTING, key ? key.trim() : null);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export class MissingKeyError extends Error {
  constructor() {
    super("Add your Anthropic API key in Settings to use AI.");
    this.name = "MissingKeyError";
  }
}

function client(): Anthropic {
  const apiKey = getApiKey();
  if (!apiKey) throw new MissingKeyError();
  return new Anthropic({ apiKey });
}

export type ToolSpec = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
  run: (input: Record<string, unknown>) => Promise<string> | string;
};

type RunOptions = {
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: ToolSpec[];
  /** Server-side web search. The only path that costs meaningfully more, so
   *  it is always an explicit user action rather than something we infer. */
  webSearch?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
  onDone?: (answer: string) => void;
};

// Streams plain text back to the browser, running any client-side tools in a
// loop until Claude stops asking for them. Text arrives as it is generated so
// the popover starts saying something almost immediately.
export function streamClaude(opts: RunOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const anthropic = client();
  const messages: Anthropic.MessageParam[] = [...opts.messages];
  const byName = new Map((opts.tools ?? []).map((t) => [t.name, t]));

  const tools: Anthropic.ToolUnion[] = (opts.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
  if (opts.webSearch) {
    // Haiku 4.5 takes the basic search tool; the filtering variant is
    // Opus/Sonnet-only.
    tools.push({ type: "web_search_20250305", name: "web_search", max_uses: 4 });
  }

  let answer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Tool rounds are bounded so a confused model can't bill forever.
        for (let round = 0; round < 6; round++) {
          const stream = anthropic.messages.stream(
            {
              model: MODEL,
              max_tokens: opts.maxTokens ?? 1200,
              system: opts.system,
              messages,
              ...(tools.length ? { tools } : {}),
            },
            { signal: opts.signal }
          );

          stream.on("text", (delta) => {
            answer += delta;
            controller.enqueue(encoder.encode(delta));
          });

          const message = await stream.finalMessage();

          // A server-side tool hit its iteration cap — resend to resume. No
          // extra user turn: the API sees the trailing server_tool_use block.
          if (message.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: message.content });
            continue;
          }

          if (message.stop_reason !== "tool_use") break;

          const calls = message.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );
          const runnable = calls.filter((c) => byName.has(c.name));
          if (!runnable.length) break; // server-side tool already resolved

          messages.push({ role: "assistant", content: message.content });
          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const call of runnable) {
            const tool = byName.get(call.name)!;
            try {
              const out = await tool.run(call.input as Record<string, unknown>);
              results.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: out || "No matching messages found.",
              });
            } catch (e) {
              // Hand the failure back rather than dropping it, so Claude can
              // try a different search instead of stalling.
              results.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: `Search failed: ${(e as Error).message}`,
                is_error: true,
              });
            }
          }
          messages.push({ role: "user", content: results });
        }
        opts.onDone?.(answer);
        controller.close();
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") {
          // A half-written answer is still worth keeping.
          opts.onDone?.(answer);
          controller.close();
          return;
        }
        if (!answer) {
          controller.enqueue(encoder.encode(friendlyError(err)));
        }
        opts.onDone?.(answer);
        controller.close();
      }
    },
  });
}

// Anthropic's raw messages leak model ids and status codes into a popover that
// is three sentences tall. Say the thing the user can act on instead.
export function friendlyError(e: Error): string {
  if (e.name === "MissingKeyError") return e.message;
  const status = (e as { status?: number }).status;
  if (status === 401) return "That API key was rejected. Check it in Settings.";
  if (status === 429) return "Rate limited by Anthropic — try again in a moment.";
  if (status === 400 && /credit|balance/i.test(e.message)) {
    return "Your Anthropic account is out of credit.";
  }
  if (status && status >= 500) return "Anthropic is having trouble. Try again shortly.";
  return e.message || "Something went wrong.";
}
