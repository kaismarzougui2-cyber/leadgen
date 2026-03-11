"use client";

import { useEffect, useRef, useState } from "react";

const LERP = 0.14;

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -300, y: -300 });
  const current = useRef({ x: -300, y: -300 });
  const rafId = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const isTouch = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) {
      isTouch.current = true;
      return;
    }

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    function loop() {
      const el = cursorRef.current;
      if (el) {
        current.current.x += (pos.current.x - current.current.x) * LERP;
        current.current.y += (pos.current.y - current.current.y) * LERP;
        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
      }
      rafId.current = requestAnimationFrame(loop);
    }
    rafId.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(rafId.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isTouch.current) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 99999,
        willChange: "transform",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.12s",
      }}
    >
      {/* Figma-style collaboration arrow cursor */}
      <svg
        width="24"
        height="30"
        viewBox="0 0 24 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
      >
        {/* Arrow shape — same asymmetric silhouette as Figma's multiplayer cursor */}
        <path
          d="M2 2L2 22L7.5 16.5L11.5 26L14.5 24.8L10.5 15L18 15L2 2Z"
          fill="#8B5CF6"
          stroke="white"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* Label badge — anchored bottom-right of the arrow tip */}
      <div
        style={{
          position: "absolute",
          top: "22px",
          left: "16px",
          backgroundColor: "#8B5CF6",
          color: "white",
          fontSize: "11px",
          fontWeight: 600,
          lineHeight: 1,
          padding: "3px 7px",
          borderRadius: "0 6px 6px 6px",
          whiteSpace: "nowrap",
          fontFamily: "Inter, system-ui, sans-serif",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          userSelect: "none",
        }}
      >
        Toi
      </div>
    </div>
  );
}
