import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "outrunn.lol — run further, move up",
  description: "The daily running leaderboard. Verify your Run, claim a rank, and outrun the internet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#f8f8f6" />
      </head>
      <body>{children}</body>
    </html>
  );
}
