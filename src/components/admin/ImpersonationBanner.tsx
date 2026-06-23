import React, { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Eye, LogOut } from "lucide-react";
import {
  clearImpersonationMeta,
  readImpersonationMeta,
  type ImpersonationMeta,
} from "@/lib/impersonation";

export function ImpersonationBanner() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);

  useEffect(() => {
    setMeta(readImpersonationMeta());
  }, [user?.id]);

  if (!meta) return null;

  const displayName =
    meta.targetName?.trim() ||
    meta.targetEmail?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "this user";

  const signedInEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  const targetEmail = meta.targetEmail?.trim().toLowerCase();
  const impersonationMismatch =
    !!signedInEmail && !!targetEmail && signedInEmail !== targetEmail;

  const handleExit = async () => {
    const returnUrl = meta.returnUrl || "/admin/users";
    clearImpersonationMeta();
    try {
      await signOut();
    } catch {
      /* still navigate */
    }
    window.location.href = returnUrl;
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-sm text-amber-950 dark:bg-amber-500/20 dark:text-amber-50"
    >
      <div className="flex items-center gap-2 font-medium">
        <Eye className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Viewing as <strong>{displayName}</strong> (impersonation mode)
          {impersonationMismatch ? (
            <span className="ml-1 font-normal text-destructive">
              — session mismatch; exit and impersonate again from Admin → Users.
            </span>
          ) : null}
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 border-amber-600/50 bg-background/80 text-amber-950 hover:bg-amber-500/20 dark:text-amber-50"
        onClick={() => void handleExit()}
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Exit impersonation
      </Button>
    </div>
  );
}
