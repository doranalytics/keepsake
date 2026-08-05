// One entry per shipped batch of features, newest first. The landing page
// renders this directly; installed apps read it from sidenote.lol via
// /api/changelog so update prompts can say what's actually new.

export type ChangelogEntry = {
  date: string; // display form, e.g. "Aug 5, 2026"
  title: string;
  points: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "Aug 6, 2026",
    title: "Live threads, sending, and photos",
    points: [
      "New texts appear on their own, seconds after they arrive — no Sync button",
      "Reply right from Sidenote: messages send through your real iMessage account",
      "Photos and attachments now show up in conversations (HEIC included)",
      "Links get rich previews with images, like the real Messages app",
    ],
  },
  {
    date: "Aug 5, 2026",
    title: "Sidenote updates itself",
    points: [
      "An update banner appears in the app whenever a new version ships",
      "One click in Settings pulls, rebuilds, and relaunches — no Terminal",
      "What's-new notes right here on the homepage",
    ],
  },
  {
    date: "Aug 5, 2026",
    title: "Ask AI sees your whole history",
    points: [
      "Questions now search the entire conversation — years back, not just recent texts",
      "Exports no longer have a size limit: the full thread, however big",
      "A bigger recent-context window for summaries and answers",
    ],
  },
  {
    date: "Aug 5, 2026",
    title: "Way easier setup",
    points: [
      "Full Disk Access is now a guided two-step: flip one switch, click restart",
      "Sidenote starts at login and keeps running — reopen it any time at localhost:4747",
      "In-app Settings: pick your AI model, see sync status",
      "“Open Sidenote” on the homepage when it's already installed",
    ],
  },
];
