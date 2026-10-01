import { createContext, useContext } from "react";

export interface AdminSession {
    email: string;
    logout: () => Promise<void>;
    expire: () => void;
}

export const AdminContext = createContext<AdminSession | null>(null);

export function useAdmin(): AdminSession {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error("useAdmin fuera del shell del admin");
    return ctx;
}
