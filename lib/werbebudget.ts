export const FIRST_AD_BUDGET_MONTH = "2026-12";
export const FIRST_AD_BUDGET_START_LABEL = "24. November 2026";
export const AD_BUDGET_TIME_ZONE = "Europe/Vienna";

function localDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AD_BUDGET_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return { month: `${value("year")}-${value("month")}`, day: Number(value("day")) };
}

export function isAdBudgetMonth(month: unknown): month is string {
  return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= FIRST_AD_BUDGET_MONTH;
}

export function getAdBudgetMonth(now = new Date()): string {
  const { month } = localDate(now);
  return month < FIRST_AD_BUDGET_MONTH ? FIRST_AD_BUDGET_MONTH : month;
}

export function getAdBudgetCycle(month: string, now = new Date()) {
  if (!isAdBudgetMonth(month)) throw new Error("Ungültiger Monat.");
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = localDate(now);
  return {
    month,
    label: new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, monthNumber - 1, 1))),
    drawDate: `${lastDay}.${String(monthNumber).padStart(2, "0")}.${year}`,
    activityPeriod: month === FIRST_AD_BUDGET_MONTH
      ? `${FIRST_AD_BUDGET_START_LABEL} bis 31. Dezember 2026`
      : new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(year, monthNumber - 1, 1))),
    canReview: today.month > month || (today.month === month && today.day === lastDay),
    nextMonth: `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, "0")}`,
  };
}

export type AdBudgetApplication = {
  id: string;
  userId: string;
  username: string;
  bookId: string;
  bookTitle: string;
  socialHandle: string;
  notes: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
};

export type AdBudgetRound = {
  _id: string;
  revision: number;
  status: "open";
  applications: AdBudgetApplication[];
};

export type AdBudgetData = {
  cycle: ReturnType<typeof getAdBudgetCycle>;
  closed: boolean;
  myApplication: AdBudgetApplication | null;
  myBooks: { id: string; title: string }[];
  isAdmin: boolean;
  applications?: AdBudgetApplication[];
  months?: string[];
};
