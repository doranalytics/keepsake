// Shared client-side preference for which Ollama model answers AI questions.
// Stored in localStorage; a window event keeps every open picker in sync.

const MODEL_KEY = "keepsake-ollama-model";
const EVENT = "sidenote-model-changed";

export function getSavedModel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MODEL_KEY);
}

export function saveModel(name: string) {
  localStorage.setItem(MODEL_KEY, name);
  window.dispatchEvent(new Event(EVENT));
}

export function onModelChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

// The saved model if it's still installed, otherwise the server default.
export function resolveModel(
  models: { name: string }[],
  fallback: string | null
): string | null {
  const saved = getSavedModel();
  if (saved && models.some((m) => m.name === saved)) return saved;
  return fallback;
}
