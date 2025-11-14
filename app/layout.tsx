export const metadata = {
  title: "Jarvis AI Assistant",
  description: "A Jarvis-like AI agent assistant."
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
