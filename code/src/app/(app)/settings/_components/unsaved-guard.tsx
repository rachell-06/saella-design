"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UnsavedDialog } from "@/components/saella/unsaved-dialog";

// Unsaved-changes guard for the Settings forms (Company). Live app EmailDomainsManager.tsx: leaving a tab
// with edits asks Save / Discard / Keep editing (PATTERNS 9.10). Here the "tabs" are the Settings nav links; the
// browser's own prompt covers closing or reloading the page. Links outside Settings (sidebar) aren't intercepted.
export type Guard = {
  section: string;
  dirty: boolean;
  /** Resolves false when the save was refused (e.g. empty name, over the limit): the user stays. */
  save: () => Promise<boolean>;
  discard: () => void;
};

type Ctx = {
  register: (g: Guard | null) => void;
  /** Navigate within Settings, asking first when the current form has unsaved edits. */
  navigate: (href: string) => boolean;
};

const GuardContext = createContext<Ctx | null>(null);

export function UnsavedGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const guard = useRef<Guard | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [section, setSection] = useState("This page");
  const [saving, setSaving] = useState(false);

  const register = useCallback((g: Guard | null) => {
    guard.current = g;
  }, []);

  const navigate = useCallback((href: string) => {
    if (!guard.current?.dirty) return false;
    setSection(guard.current.section);
    setPending(href);
    return true;
  }, []);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (guard.current?.dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const go = (href: string) => {
    setPending(null);
    router.push(href);
  };

  return (
    <GuardContext.Provider value={{ register, navigate }}>
      {children}
      <UnsavedDialog
        open={pending !== null}
        title="Save your changes?"
        description={`${section} has unsaved changes. Save them before you leave, or discard them.`}
        discardLabel="Discard changes"
        saveLabel="Save changes"
        saving={saving}
        onKeepEditing={() => setPending(null)}
        onDiscard={() => {
          guard.current?.discard();
          if (pending) go(pending);
        }}
        onSave={async () => {
          if (!guard.current || !pending) return;
          setSaving(true);
          const ok = await guard.current.save();
          setSaving(false);
          if (ok) go(pending);
          else setPending(null);
        }}
      />
    </GuardContext.Provider>
  );
}

/** Register the page's form with the guard; pass the latest values on every render. */
export function useUnsavedGuard(g: Guard) {
  const ctx = useContext(GuardContext);
  const latest = useRef(g);
  useEffect(() => {
    latest.current = g;
  });
  useEffect(() => {
    if (!ctx) return;
    ctx.register({
      get section() {
        return latest.current.section;
      },
      get dirty() {
        return latest.current.dirty;
      },
      save: () => latest.current.save(),
      discard: () => latest.current.discard(),
    });
    return () => ctx.register(null);
  }, [ctx]);
}

export function useGuardedNavigate() {
  return useContext(GuardContext)?.navigate ?? (() => false);
}
