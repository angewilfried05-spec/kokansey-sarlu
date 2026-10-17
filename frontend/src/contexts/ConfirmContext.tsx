import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import ConfirmationModal from "../components/ConfirmationModal";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions | string) => Promise<boolean>) | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const normalized: ConfirmOptions = typeof opts === "string" ? { message: opts } : opts;
      resolverRef.current = resolve;
      setState({
        title: normalized.title ?? "Confirmation",
        message: normalized.message,
        confirmText: normalized.confirmText ?? "Confirmer",
        cancelText: normalized.cancelText ?? "Annuler",
        variant: normalized.variant ?? "danger",
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState(null);
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmationModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={state.title}
          message={state.message}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          variant={state.variant}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Remplace window.confirm : `if (!(await confirmDialog("Message ?"))) return;`
 * Le handler appelant doit être async.
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
