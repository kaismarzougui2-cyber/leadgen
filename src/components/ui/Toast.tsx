"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

/* ─── Context ────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── Icônes par type ────────────────────────────────────────── */
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 shrink-0" />,
  error:   <XCircle    className="w-4 h-4 shrink-0" />,
  info:    <Info       className="w-4 h-4 shrink-0" />,
};

/* ─── Styles par type ────────────────────────────────────────── */
const STYLES: Record<ToastType, string> = {
  success: "bg-[#001a05] border border-[#22C55E]/30 text-[#22C55E]",
  error:   "bg-[#160002]  border border-[#E5000A]/30 text-[#E5000A]",
  info:    "bg-[#0d0d0d]  border border-[#2a2a2a]   text-[#aaaaaa]",
};

/* ─── Item individuel ────────────────────────────────────────── */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Déclenche l'animation d'entrée
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        transform: visible ? "translateX(0)" : "translateX(calc(100% + 1rem))",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
      }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.7)]
        min-w-[260px] max-w-[360px] text-sm font-medium
        ${STYLES[toast.type]}
      `}
    >
      {ICONS[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Provider ───────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss après 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => t.id === id ? { ...t, _dismissing: true } as Toast : t)
      );
      setTimeout(() => dismiss(id), 300);
    }, 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Zone d'affichage — coin supérieur droit */}
      <div
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}
