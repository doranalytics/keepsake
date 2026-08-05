import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sidenote — remember your conversations",
  description:
    "An iMessage companion. Search everything you've ever texted, keep notes on the people you care about, and ask on-device AI about any thread.",
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
