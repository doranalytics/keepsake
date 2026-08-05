import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sidenote.lol"),
  title: "Sidenote — remember your conversations",
  description:
    "An iMessage companion. Search everything you've ever texted, keep notes on the people you care about, and ask on-device AI about any thread.",
  openGraph: {
    title: "Sidenote — every text, remembered",
    description:
      "Search your entire iMessage history, pin the moments that matter, and ask AI about any conversation. 100% on your Mac.",
    url: "https://sidenote.lol",
    siteName: "Sidenote",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sidenote" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sidenote — every text, remembered",
    description:
      "Search your entire iMessage history, pin the moments that matter, and ask AI about any conversation. 100% on your Mac.",
    images: ["/og.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Sidenote",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')",
          }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
