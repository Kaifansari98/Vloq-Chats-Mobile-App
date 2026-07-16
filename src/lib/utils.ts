import { format, isToday, isYesterday, parseISO } from "date-fns";

export function formatMessageTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "HH:mm");
}

export function formatChatTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
}

export function formatDateDivider(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : value < 10 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
