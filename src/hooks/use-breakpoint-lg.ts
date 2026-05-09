import * as React from "react";

/** Matches Tailwind `lg:` (1024px). */
export const LG_BREAKPOINT_PX = 1024;

export function useIsLgUp(): boolean {
  const [isLg, setIsLg] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT_PX}px)`);
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener("change", onChange);
    setIsLg(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLg;
}
