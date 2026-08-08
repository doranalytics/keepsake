import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemo } from "@/lib/store";
import { SidenoteApp } from "@/components/sidenote-app";

// The live demo, on its own page so the homepage stays the homepage. Only
// exists on the web — inside Sidenote.app there is nothing to demo.
export const metadata: Metadata = {
  title: "Sidenote — live demo",
  description:
    "Try Sidenote with fictional sample conversations. Right-click any message to see what Explain this does.",
};

export default function Demo() {
  if (!isDemo) notFound();
  return <SidenoteApp />;
}
