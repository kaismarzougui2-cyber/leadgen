"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Enveloppe le contenu d'une page dans un conteneur animé.
 * À placer dans le layout principal ou directement autour du contenu de chaque page.
 *
 * Utilisation :
 *   <PageTransition><main>…</main></PageTransition>
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset + relance l'animation à chaque changement de route
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";

    const frame = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
