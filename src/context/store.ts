import { createContext, useContext } from "react";
import { ThemeStore } from "../stores/ThemeStore";

export const store = { themeStore: new ThemeStore() };

export const StoreContext = createContext(store);

export const useStore = () => useContext(StoreContext);
