import { createContext, useContext } from "react";

export type ToastKind = "ok" | "error";

export interface ToastApi {
    toast: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastApi>({ toast: () => undefined });

export const useToast = (): ToastApi => useContext(ToastContext);
