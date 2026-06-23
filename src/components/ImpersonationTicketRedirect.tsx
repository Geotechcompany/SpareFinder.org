import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  buildImpersonationLoginUrl,
  readImpersonationTicketFromSearch,
} from "@/lib/impersonation";

/** Routes legacy `?__clerk_ticket=` links (e.g. /dashboard) to /login for consumption. */
export function ImpersonationTicketRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/login") return;
    const ticket = readImpersonationTicketFromSearch(location.search);
    if (!ticket) return;

    const params = new URLSearchParams(location.search);
    const next = params.get("next") || "/dashboard";
    navigate(buildImpersonationLoginUrl(ticket, next), { replace: true });
  }, [location.pathname, location.search, navigate]);

  return null;
}
