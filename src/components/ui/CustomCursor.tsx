"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CustomCursor
 * – Dot (4px) + ring (32px) that follows the mouse.
 * – Ring uses lerp (linear interpolation) for a smooth trailing effect.
 * – Hover state (buttons, links, [data-cursor="pointer"]): ring scales up,
 *   dot disappears, ring fills with a semi-transparent purple.
 * – Hidden on touch/mobile devices (pointer: coarse).
 */

const DOT_SIZE = 6;
const RING_SIZE = 32;
const LERP = 0.12; // 0–1 — lower = more lag

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -200, y: -200 });
  const ring = useRef({ x: -200, y: -200 });
  const rafId = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    // Don't render on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Detect hover over interactive elements
      const target = e.target as HTMLElement;
      const isHovering = !!(
        target.closest("button, a, input, select, textarea, label, [role='button'], [data-cursor='pointer']")
      );
      setHovering(isHovering);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    // Animation loop
    function animate() {
      const dot = dotRef.current;
      const ringEl = ringRef.current;
      if (dot && ringEl) {
        // Dot: instant follow
        dot.style.transform = `translate(${mouse.current.x - DOT_SIZE / 2}px, ${mouse.current.y - DOT_SIZE / 2}px)`;

        // Ring: lerp
        ring.current.x += (mouse.current.x - ring.current.x) * LERP;
        ring.current.y += (mouse.current.y - ring.current.y) * LERP;
        ringEl.style.transform = `translate(${ring.current.x - RING_SIZE / 2}px, ${ring.current.y - RING_SIZE / 2}px)`;
      }
      rafId.current = requestAnimationFrame(animate);
    }
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(rafId.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On touch devices, render nothing
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 99999,
          borderRadius: "50%",
          backgroundColor: hovering ? "transparent" : "#8B5CF6",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s, background-color 0.15s",
          willChange: "transform",
        }}
      />

      {/* Ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 99998,
          borderRadius: "50%",
          border: `1.5px solid ${hovering ? "#8B5CF6" : "rgba(139,92,246,0.5)"}`,
          backgroundColor: hovering ? "rgba(139,92,246,0.12)" : "transparent",
          opacity: visible ? 1 : 0,
          transform: hovering ? "scale(1.5)" : "scale(1)",
          transition: "opacity 0.15s, border-color 0.2s, background-color 0.2s",
          willChange: "transform",
        }}
      />
    </>
  );
}
