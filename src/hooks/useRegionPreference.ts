import { useState, useEffect, useCallback } from "react";
import {
  buildRegionLabel,
  DEFAULT_REGION_PREFERENCE,
  detectLocation,
  loadRegionPreference,
  persistRegionPreference,
  type RegionPreference,
} from "@/lib/region-preference";

export function useRegionPreference() {
  const [prefs, setPrefs] = useState<RegionPreference>(DEFAULT_REGION_PREFERENCE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const loaded = await loadRegionPreference();
      setPrefs(loaded);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const savePreference = useCallback(async (next: Partial<RegionPreference>) => {
    setIsSaving(true);
    setError(false);
    try {
      const current = await loadRegionPreference();
      const merged = { ...current, ...next };
      await persistRegionPreference(merged);
      setPrefs(merged);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const detectAndSave = useCallback(async () => {
    setIsSaving(true);
    setError(false);
    try {
      const current = await loadRegionPreference();
      const loc = await detectLocation();
      const merged: RegionPreference = {
        ...current,
        useRegionalSuppliers: true,
        userCountry: loc.country,
        userRegion: loc.region,
        userCurrency: loc.currency.toUpperCase(),
      };
      await persistRegionPreference(merged);
      setPrefs(merged);
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const regionLabel =
    prefs.useRegionalSuppliers && buildRegionLabel(prefs.userCountry, prefs.userRegion);

  return {
    ...prefs,
    regionLabel,
    isLoading,
    isSaving,
    error,
    refresh,
    savePreference,
    detectAndSave,
  };
}
