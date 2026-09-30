import type { PropsWithChildren } from "react";
import { store, StoreContext } from "./store";

export const StoreProvider = ({ children }: PropsWithChildren) => (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
);
