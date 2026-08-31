import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "outrun.lol — run further, move up",
  description: "The daily running leaderboard. Connect Strava, log your miles, and outrun the internet.",
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
