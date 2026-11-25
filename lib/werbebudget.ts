export const FIRST_AD_BUDGET_MONTH = "2026-12";
export const FIRST_AD_BUDGET_START_LABEL = "24. November 2026";
export const AD_BUDGET_TIME_ZONE = "Europe/Vienna";
export const AD_BUDGET_RETENTION_DAYS = 180;
export const AD_BUDGET_COUNTRIES = { AT: "Österreich", DE: "Deutschland", CH: "Schweiz" } as const;
export type AdBudgetCountry = keyof typeof AD_BUDGET_COUNTRIES;
export const AD_BUDGET_PARTICIPATION_OPTIONS = {
  "comments-and-shares": "10 sinnvolle Kommentare + 3 Instagram-Story-Teilungen",
  "comments-only": "20 sinnvolle Kommentare",
} as const;
export type AdBudgetParticipationOption = keyof typeof AD_BUDGET_PARTICIPATION_OPTIONS;

export function isAdBudgetParticipationOption(value: unknown): value is AdBudgetParticipationOption {
  return typeof value === "string" && Object.hasOwn(AD_BUDGET_PARTICIPATION_OPTIONS, value);
}

export function isAdBudgetCountry(value: unknown): value is AdBudgetCountry {
  return typeof value === "string" && Object.hasOwn(AD_BUDGET_COUNTRIES, value);
}

// Convert an unambiguous Vienna wall-clock time, including summer time, to UTC.
function viennaInstant(year: number, monthIndex: number, day: number, hour: number): Date {
  const wall = Date.UTC(year, monthIndex, day, hour);
  let instant = wall;
  for (let i = 0; i < 2; i++) {
    const offset = new Intl.DateTimeFormat("en", { timeZone: AD_BUDGET_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(new Date(instant)).find((p) => p.type === "timeZoneName")!.value;
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset)!;
    const minutes = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1);
    instant = wall - minutes * 60_000;
  }
  return new Date(instant);
}

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
  const label = new Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const startsAt = month === FIRST_AD_BUDGET_MONTH
    ? viennaInstant(2026, 10, 24, 0) : viennaInstant(year, monthNumber - 1, 1, 0);
  const deadlineAt = viennaInstant(year, monthNumber - 1, lastDay, 18);
  return {
    month,
    label,
    drawDate: `${lastDay}.${String(monthNumber).padStart(2, "0")}.${year}`,
    activityPeriod: month === FIRST_AD_BUDGET_MONTH
      ? `${FIRST_AD_BUDGET_START_LABEL} bis 31. Dezember 2026`
      : label,
    startsAt: startsAt.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
    applicationsOpen: now >= startsAt && now < deadlineAt,
    canReview: now >= deadlineAt,
    nextMonth: `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, "0")}`,
  };
}

export function getAdBudgetExpiry(month: string): Date {
  return new Date(Date.parse(getAdBudgetCycle(month).deadlineAt) + AD_BUDGET_RETENTION_DAYS * 86_400_000);
}

export type AdBudgetAcceptance = {
  version: string;
  acceptedAt: string;
  eligibilityConfirmed: true;
  rightsConfirmed: true;
};

export type AdBudgetApplication = {
  id: string;
  userId: string;
  username: string;
  bookId: string;
  bookTitle: string;
  socialHandle: string;
  /** Legacy evidence from earlier applications; no longer collected. */
  notes?: string;
  participationOption?: AdBudgetParticipationOption;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewReason?: string;
  country?: AdBudgetCountry;
  acceptance?: AdBudgetAcceptance;
  initialAcceptance?: AdBudgetAcceptance;
  publicationConsent?: { granted: boolean; updatedAt: string };
  withdrawnAt?: string;
};

export type AdBudgetRound = {
  _id: string;
  revision: number;
  status: "open";
  applications: AdBudgetApplication[];
  expiresAt?: Date;
};

export type AdBudgetData = {
  cycle: ReturnType<typeof getAdBudgetCycle>;
  closed: boolean;
  myApplication: AdBudgetApplication | null;
  myBooks: { id: string; title: string }[];
  myPreviousApplications: { month: string; application: AdBudgetApplication }[];
  isAdmin: boolean;
  applications?: AdBudgetApplication[];
  months?: string[];
};
