import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface DockAction {
  id: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}

const DockContext = createContext<{ actions: DockAction[]; setActions: (a: DockAction[]) => void }>({
  actions: [],
  setActions: () => {},
});

export const DockProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActions] = useState<DockAction[]>([]);
  return <DockContext.Provider value={{ actions, setActions }}>{children}</DockContext.Provider>;
};

export const useDock = () => useContext(DockContext);

/** A page registers its edit actions here; they all appear together in the floating edit dock. */
export const useDockActions = (actions: DockAction[], deps: unknown[]) => {
  const { setActions } = useContext(DockContext);
  useEffect(() => {
    setActions(actions);
    return () => setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
