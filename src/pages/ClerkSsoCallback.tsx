import React, { useEffect, useMemo, useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";

type ClerkSsoCallbackProps = {
  /**
   * Where to send the user after Clerk completes the OAuth/SAML redirect.
   * If omitted, we fall back to a URL param (if present) or "/dashboard".
   */
  redirectUrlComplete?: string;
};

const ClerkSsoCallback = ({ redirectUrlComplete }: ClerkSsoCallbackProps) => {
  const clerk = useClerk();
  const location = useLocation();
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedRedirectUrlComplete = useMemo(() => {
    if (redirectUrlComplete) return redirectUrlComplete;

    const params = new URLSearchParams(location.search);
    return (
      params.get("redirect_url_complete") ||
      params.get("redirectUrlComplete") ||
      params.get("redirect_url") ||
      undefined
    );
  }, [location.search, redirectUrlComplete]);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        // Clerk recommends calling `handleRedirectCallback()` after `authenticateWithRedirect()`.
        // The method exists at runtime, but is not always present in typings across versions.
        const handleRedirectCallback = (clerk as any)?.handleRedirectCallback as
          | ((opts?: { redirectUrlComplete?: string }) => Promise<unknown>)
          | undefined;

        if (typeof handleRedirectCallback === "function") {
          await handleRedirectCallback({
            redirectUrlComplete: resolvedRedirectUrlComplete,
          });
        }

        if (isCancelled) return;
        navigate(resolvedRedirectUrlComplete || "/dashboard", { replace: true });
      } catch (err: any) {
        console.error("❌ Clerk SSO callback failed:", err);
        const msg =
          err?.errors?.[0]?.message ||
          err?.message ||
          "Unable to complete sign-in. Please try again.";

        if (!isCancelled) setErrorMessage(msg);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [clerk, navigate, resolvedRedirectUrlComplete]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center">
        {errorMessage ? (
          <>
            <div className="text-base font-semibold">Sign-in failed</div>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => navigate("/login", { replace: true })}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="text-base font-semibold">Completing sign-in…</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we finish securely connecting your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ClerkSsoCallback;
