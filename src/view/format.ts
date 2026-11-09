const SIZE_UNITS = ["KB", "MB", "GB"];

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${SIZE_UNITS[unit]}`;
}

export const dayMonth = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function expiresIn(expires: number | undefined, now: number) {
  if (!expires) return undefined;
  const hours = Math.max(0, (expires - now) / 3_600_000);
  if (hours < 1) return "soon";
  return hours < 48 ? `in ${Math.round(hours)}h` : `in ${Math.round(hours / 24)}d`;
}

export const clock = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function commonRoot(paths: string[]) {
  const first = paths[0]?.split("/")[0];
  return first && paths.every((path) => path.startsWith(`${first}/`)) ? `${first}/` : "";
}
