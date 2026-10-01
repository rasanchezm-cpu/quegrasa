"use client";

// Color de fondo del DOCUMENTO (html/body) por página.
// Arregla los "bordes blancos" en iPhone: Safari usa el fondo del html
// para la barra de estado, el overscroll y las safe areas. Cada página
// declara el suyo y lo limpia al desmontarse.
import { useEffect } from "react";

export default function PageTheme({ color }: { color: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, [color]);

  return null;
}
