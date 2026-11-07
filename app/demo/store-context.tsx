"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { catalog, type StoreState } from "./_lib/catalog";

type Result = { state: StoreState; orderId?: string; ticketId?: string };
type StoreContextValue = {
  state: StoreState;
  loading: boolean;
  busy: boolean;
  error: string;
  notice: string;
  clearError: () => void;
  act: (
    input: Record<string, unknown>,
    message?: string,
  ) => Promise<Result | null>;
};
const StoreContext = createContext<StoreContextValue | null>(null);
const initialState: StoreState = {
  products: catalog,
  cart: [],
  saved: [],
  coupon: "",
  delivery: "standard",
  subtotal: 0,
  discount: 0,
  shipping: 0,
  total: 0,
  user: null,
  orders: [],
  tickets: [],
};

export function StoreProvider({
  scenario,
  children,
}: {
  scenario?: "broken" | "fixed";
  children: ReactNode;
}) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/demo/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bootstrap", scenario }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setState(result.state);
        setError("");
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "The store could not load. Please refresh to try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [scenario]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const act = useCallback(
    async (input: Record<string, unknown>, message?: string) => {
      if (locked.current) return null;
      locked.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const response = await fetch("/demo/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "We couldn’t save that change.");
        setState(result.state);
        if (message) setNotice(message);
        return result as Result;
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Couldn’t connect. Check your connection and try again.",
        );
        return null;
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [],
  );
  useEffect(() => {
    const refresh = async () => {
      if (locked.current || document.visibilityState === "hidden" || error)
        return;
      try {
        const response = await fetch("/demo/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "state" }),
        });
        if (response.ok && !locked.current)
          setState((await response.json()).state);
      } catch {
        /* The next explicit operation reports connectivity errors. */
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [error]);
  return (
    <StoreContext.Provider
      value={{
        state,
        loading,
        busy: busy || loading,
        error,
        notice,
        clearError: () => setError(""),
        act,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store context is required");
  return value;
}
