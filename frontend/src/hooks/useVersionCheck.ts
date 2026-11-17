import { useEffect, useRef } from "react";
import { useToast } from "../contexts/ToastContext";

const POLL_INTERVAL_MS = 60_000;
const RELOAD_DELAY_MS = 4_000;

/**
 * Sonde /version.json périodiquement. Quand la version déployée diffère
 * de celle chargée au démarrage, notifie puis recharge l'application.
 */
export function useVersionCheck() {
  const toast = useToast();
  const baseVersion = useRef<string | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;
        const data = await res.json();
        const v = data?.version;
        if (typeof v !== "string" || !v) return;

        if (baseVersion.current === null) {
          baseVersion.current = v;
          return;
        }

        if (v !== baseVersion.current && !reloading.current) {
          reloading.current = true;
          toast.info("Nouvelle version disponible — actualisation…");
          setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
        }
      } catch {
        // Réseau indisponible ou dev sans version.json — silencieux
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
