export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export type TimeOfDayGreeting = {
  period: TimeOfDay;
  greeting: string;
  subtitle: string;
};

const SUBTITLES: Record<TimeOfDay, string> = {
  morning: "Start the day with smarter spare-part identification",
  afternoon: "Here's what's happening with your part identification today",
  evening: "Review today's identifications and keep operations moving",
  night: "Your industrial parts workspace is ready whenever you are",
};

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function getTimeOfDayGreeting(date = new Date()): TimeOfDayGreeting {
  const period = getTimeOfDay(date);
  const greeting =
    period === "morning"
      ? "Good morning"
      : period === "afternoon"
        ? "Good afternoon"
        : period === "evening"
          ? "Good evening"
          : "Good night";

  return { period, greeting, subtitle: SUBTITLES[period] };
}

export function getFirstName(fullName?: string | null, email?: string | null): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = email?.split("@")[0]?.replace(/[._-]/g, " ").trim();
  if (fromEmail) {
    return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  }
  return "there";
}
