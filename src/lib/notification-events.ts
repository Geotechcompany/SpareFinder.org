/** Browser event used to refresh notification bell + notifications page. */
export const NOTIFICATIONS_REFRESH_EVENT = "notifications:refresh";

export function dispatchNotificationsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
}
