import assert from "node:assert/strict";
import test from "node:test";
import { getAdBudgetCycle, getAdBudgetExpiry, getAdBudgetMonth, isAdBudgetCountry, isAdBudgetMonth } from "./werbebudget";
import { AD_BUDGET_POLICIES, AD_BUDGET_TERMS_PATH, AD_BUDGET_TERMS_VERSION } from "./werbebudget-terms";

test("Dezember-Runde beginnt schon im November einschließlich der Aktivitäten", () => {
  assert.equal(getAdBudgetMonth(new Date("2026-11-24T12:00:00Z")), "2026-12");
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-11-24T12:00:00Z")).activityPeriod, "24. November 2026 bis 31. Dezember 2026");
  assert.equal(getAdBudgetCycle("2026-12").drawDate, "31.12.2026");
});

test("Jahreswechsel und Monatswechsel erfolgen um Mitternacht in Wien", () => {
  assert.equal(getAdBudgetMonth(new Date("2026-12-31T22:59:59Z")), "2026-12");
  assert.equal(getAdBudgetMonth(new Date("2026-12-31T23:00:00Z")), "2027-01");
  assert.equal(getAdBudgetCycle("2026-12").nextMonth, "2027-01");
  assert.equal(getAdBudgetMonth(new Date("2027-06-30T21:59:59Z")), "2027-06");
  assert.equal(getAdBudgetMonth(new Date("2027-06-30T22:00:00Z")), "2027-07");
});

test("Abschließende Prüfung erst nach dem Bewerbungsschluss um 18 Uhr möglich", () => {
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-31T16:59:59Z")).canReview, false);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-31T17:00:00Z")).canReview, true);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2027-01-02T12:00:00Z")).canReview, true);
});

test("Bewerbungsschluss und Ziehung berücksichtigen Sommer- und Winterzeit", () => {
  assert.equal(getAdBudgetCycle("2026-12").deadlineAt, "2026-12-31T17:00:00.000Z");
  assert.equal(getAdBudgetCycle("2026-12").drawAt, "2026-12-31T19:00:00.000Z");
  assert.equal(getAdBudgetCycle("2027-06").deadlineAt, "2027-06-30T16:00:00.000Z");
  assert.equal(getAdBudgetCycle("2027-06").drawAt, "2027-06-30T18:00:00.000Z");
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-31T16:59:59Z")).applicationsOpen, true);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-31T17:00:00Z")).applicationsOpen, false);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-11-23T22:59:59Z")).applicationsOpen, false);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-11-23T23:00:00Z")).applicationsOpen, true);
});

test("Bewerbungsdaten laufen 180 Tage nach Bewerbungsschluss ab", () => {
  const expiry = getAdBudgetExpiry("2026-12");
  assert.equal(expiry.getTime() - Date.parse(getAdBudgetCycle("2026-12").deadlineAt), 180 * 86_400_000);
});

test("Teilnahmeländer und gespeicherte Bedingungsversion sind überprüfbar", () => {
  assert.equal(isAdBudgetCountry("AT"), true);
  assert.equal(isAdBudgetCountry("DE"), true);
  assert.equal(isAdBudgetCountry("CH"), true);
  assert.equal(isAdBudgetCountry("US"), false);
  assert.equal(isAdBudgetCountry("__proto__"), false);
  assert.ok(AD_BUDGET_TERMS_PATH.endsWith(AD_BUDGET_TERMS_VERSION));
  assert.ok(AD_BUDGET_POLICIES[AD_BUDGET_TERMS_VERSION].terms.length > 0);
  assert.ok(AD_BUDGET_POLICIES[AD_BUDGET_TERMS_VERSION].privacy.length > 0);
});

test("Februar und Schaltjahre haben den passenden Ziehungstag", () => {
  assert.equal(getAdBudgetCycle("2027-02").drawDate, "28.02.2027");
  assert.equal(getAdBudgetCycle("2028-02").drawDate, "29.02.2028");
  assert.equal(getAdBudgetCycle("2028-02", new Date("2028-02-28T12:00:00Z")).canReview, false);
});

test("Die Aktion wiederholt sich in jedem Monat und über mehrere Jahre", () => {
  for (let year = 2027; year <= 2029; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      assert.equal(getAdBudgetMonth(new Date(Date.UTC(year, month - 1, 15))), key);
      assert.equal(getAdBudgetCycle(key).activityPeriod, getAdBudgetCycle(key).label);
      assert.equal(getAdBudgetCycle(key).nextMonth, `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`);
    }
  }
});

test("Nur gültige Monate ab Dezember 2026 sind erlaubt", () => {
  for (const value of [null, {}, "2026-11", "2027-00", "2027-13", "2027-1", "2027-01-01"]) {
    assert.equal(isAdBudgetMonth(value), false);
  }
  assert.equal(isAdBudgetMonth("2027-01"), true);
  assert.throws(() => getAdBudgetCycle("2027-13"));
});
