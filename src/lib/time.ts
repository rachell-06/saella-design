// Every date and time in the app is shown in the workspace time zone (GMT+7).
// Mock data stores UTC ISO strings; format them through these, never with timeZone "UTC" or the viewer's zone.
export const WORKSPACE_TZ = "Asia/Ho_Chi_Minh";
export const WORKSPACE_TZ_LABEL = "GMT+7";

/** Month, day, hour and minute of a moment in workspace time. */
export function workspaceParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: WORKSPACE_TZ,
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
}

/** Time of day in workspace time, e.g. "2:28 PM". */
export function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: WORKSPACE_TZ });
}
