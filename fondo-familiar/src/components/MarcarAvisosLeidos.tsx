"use client";

import { useEffect } from "react";
import { marcarAvisosLeidos } from "@/lib/acciones";

// Al abrir la bandeja, marca los avisos como leídos (la campana se actualiza sola).
export default function MarcarAvisosLeidos({ hayPendientes }: { hayPendientes: boolean }) {
  useEffect(() => {
    if (hayPendientes) void marcarAvisosLeidos();
  }, [hayPendientes]);
  return null;
}
