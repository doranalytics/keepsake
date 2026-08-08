import { isDemo } from "@/lib/store";
import { SidenoteApp } from "@/components/sidenote-app";
import { LandingPage } from "@/components/landing-page";

// Two very different things live at "/".
//
// On the web (sidenote.lol) this is the marketing page, always — never the app.
// Linking someone to sidenote.lol used to drop them straight into the demo once
// they'd visited before, which made the product look like a web app it isn't.
// The demo now has its own page at /demo.
//
// Inside Sidenote.app the same server renders the real thing, because there
// nothing is a demo and there's no landing page to show.
export default function Home() {
  return isDemo ? <LandingPage /> : <SidenoteApp />;
}
