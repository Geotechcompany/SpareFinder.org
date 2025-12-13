import React from "react";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { SpinningLogoLoader } from "@/components/brand/spinning-logo-loader";

type ClerkSsoCallbackProps = {
  redirectUrlComplete?: string;
};

const ClerkSsoCallback = ({ redirectUrlComplete }: ClerkSsoCallbackProps) => {
  return (
    <SpinningLogoLoader label="Signing you in…" className="p-6">
      {/* AuthenticateWithRedirectCallback renders nothing visible; it just completes the OAuth flow */}
      <AuthenticateWithRedirectCallback
        redirectUrlComplete={redirectUrlComplete}
      />
    </SpinningLogoLoader>
  );
};

export default ClerkSsoCallback;
