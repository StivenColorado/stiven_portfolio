import React, { createContext, useContext } from "react";
import { PortfolioStore } from "../stores/PortfolioStore";
const store = {
    portfolioStore: new PortfolioStore(),
}

const StoreContext = createContext(store);

export const StoreProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
)

export const useStore = () => useContext(StoreContext)