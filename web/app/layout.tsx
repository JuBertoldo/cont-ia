import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cont.IA — Painel Admin",
  description: "Painel administrativo do Cont.IA — Super Admin e Suporte Técnico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
