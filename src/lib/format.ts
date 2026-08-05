const DAY = 86400000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatListDate(ms: number): string {
  if (!ms) return "";
  const today = startOfDay(Date.now());
  const day = startOfDay(ms);
  if (day === today) {
    return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (day === today - DAY) return "Yesterday";
  if (day > today - 7 * DAY) {
    return new Date(ms).toLocaleDateString([], { weekday: "long" });
  }
  return new Date(ms).toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

export function formatSeparator(ms: number): string {
  const today = startOfDay(Date.now());
  const day = startOfDay(ms);
  const time = new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (day === today) return `Today ${time}`;
  if (day === today - DAY) return `Yesterday ${time}`;
  const date = new Date(ms).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(ms < Date.now() - 300 * DAY ? { year: "numeric" } : {}),
  });
  return `${date} at ${time}`;
}

const GRADIENTS = [
  "linear-gradient(135deg, #8e8e93, #636366)",
  "linear-gradient(135deg, #ff9500, #ff6200)",
  "linear-gradient(135deg, #34c759, #248a3d)",
  "linear-gradient(135deg, #5ac8fa, #0a84ff)",
  "linear-gradient(135deg, #af52de, #8944ab)",
  "linear-gradient(135deg, #ff2d55, #d70015)",
  "linear-gradient(135deg, #ffcc00, #ff9500)",
  "linear-gradient(135deg, #64d2ff, #5e5ce6)",
];

export function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "#";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
