import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Jost } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "QueGrasa — Ropa disponible ahora",
  description:
    "QueGrasa — ropa con stock real al momento. Barquisimeto, Venezuela. Precios en $ y Bs, pedidos por WhatsApp.",
  icons: {
    icon: "/logo.jpg",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#060606",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bebasNeue.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
