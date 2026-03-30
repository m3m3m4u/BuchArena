"use client";

import { useEffect, useState } from "react";

export const LESEZEICHEN_EVENT = "bucharena:lesezeichen";

type ToastItem = { id: number; amount: number };

let nextId = 0;

/** Zeigt einen Lesezeichen-Toast an. Kann von überall aufgerufen werden. */
export function showLesezeichenToast(amount: number) {
  if (!amount || amount <= 0) return;
  window.dispatchEvent(
    new CustomEvent(LESEZEICHEN_EVENT, { detail: { amount } }),
  );
}

export default function LesezeichenToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onEvent(e: Event) {
      const { amount } = (e as CustomEvent).detail as { amount: number };
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, amount }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    }

    window.addEventListener(LESEZEICHEN_EVENT, onEvent);
    return () => window.removeEventListener(LESEZEICHEN_EVENT, onEvent);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-[slideIn_0.3s_ease-out] rounded-xl bg-yellow-400 text-yellow-900 px-5 py-3 shadow-lg font-bold text-lg flex items-center gap-2"
        >
          🔖 +{t.amount} Lesezeichen
        </div>
      ))}
    </div>
  );
}
