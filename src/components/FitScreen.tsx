import { useLayoutEffect, useRef, type ReactNode } from "react";

const MAX_SCALE = 2.2; // permite agrandar para llenar la pantalla (todo es vectorial)

/**
 * Escala su contenido para LLENAR la pantalla (sin scroll), como un juego nativo.
 * Mide el área disponible (.fit, ya descontado el área segura) y ajusta la escala.
 * Los overlays van fuera de aquí (cubren toda la pantalla).
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
      const box = el.parentElement; // .fit (área segura disponible)
      const aw = box ? box.clientWidth : window.innerWidth;
      const ah = box ? box.clientHeight : window.innerHeight;
      const s = Math.min(MAX_SCALE, aw / w, ah / h);
      el.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
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
