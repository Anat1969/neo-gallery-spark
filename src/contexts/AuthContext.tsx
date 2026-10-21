import { createContext, useContext, type ReactNode } from "react";

/**
 * Sign-in is frozen by the owner's decision (2026-10-21): editing is open to every visitor.
 * Database policies on neo_* allow anon writes; deletions are kept in neo_trash.
 */
interface AuthContextValue {
  isAdmin: boolean;
  isLoading: boolean;
}

const value: AuthContextValue = { isAdmin: true, isLoading: false };
const AuthContext = createContext<AuthContextValue>(value);

export const AuthProvider = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
);

export const useAuth = () => useContext(AuthContext);
