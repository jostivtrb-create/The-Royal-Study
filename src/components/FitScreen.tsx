import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Escala su contenido para que SIEMPRE quepa en la pantalla (sin scroll),
 * como un juego nativo. Los overlays van fuera de aquí (cubren toda la pantalla).
 */
export default function FitScreen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.transform = "scale(1)";
      const h = el.scrollHeight;
      const w = el.scrollWidth;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const s = Math.min(1, vh / h, vw / w);
      el.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  });

  return (
    <div className="fit">
      <div className="fit-inner" ref={ref}>
        {children}
      </div>
    </div>
  );
}
