import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QueGrasa — Ropa disponible ahora",
  description:
    "Catálogo de QueGrasa: prendas disponibles al momento, precios en $ y Bs, pedidos por WhatsApp.",
};

export const viewport: Viewport = {
  // cover: la página llega hasta los bordes del iPhone (muesca/home indicator)
  viewportFit: "cover",
  // Safari iOS pinta la barra de estado/URL de este color:
  // el catálogo es negro (por defecto); el panel lo sobrescribe a claro
  themeColor: "#09090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
