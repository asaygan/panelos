import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import { QueryProvider } from "@/lib/query/provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PanelOS",
  description: "The operating system for industrial electrical panels.",
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("panelos_theme")?.value ?? "light";
  const accent = cookieStore.get("panelos_accent")?.value ?? "blue";
  const density = cookieStore.get("panelos_density")?.value ?? "default";

  return (
    <html
      lang="en"
      data-theme={theme}
      data-accent={accent}
      data-density={density}
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
