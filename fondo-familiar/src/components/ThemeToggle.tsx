"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => obs.disconnect();
};
const getClaro = () => document.documentElement.classList.contains("light");

export default function ThemeToggle() {
  const claro = useSyncExternalStore(subscribe, getClaro, () => false);

  function alternar() {
    const siguiente = !claro;
    document.documentElement.classList.toggle("light", siguiente);
    try {
      localStorage.setItem("tema", siguiente ? "claro" : "oscuro");
    } catch {}
  }

  return (
    <button
      onClick={alternar}
      aria-label={claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      className="flex size-11 items-center justify-center rounded-full border border-card-border bg-card"
    >
      {claro ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
