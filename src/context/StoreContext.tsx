import React, { createContext, useContext } from "react";
import { PortfolioStore } from "../stores/PortfolioStore";
import { ThemeStore } from "../stores/ThemeStore";
const store = {
    portfolioStore: new PortfolioStore(),
    themeStore: new ThemeStore(),
}

const StoreContext = createContext(store);

export const StoreProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
)

export const useStore = () => useContext(StoreContext)