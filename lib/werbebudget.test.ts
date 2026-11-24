import assert from "node:assert/strict";
import test from "node:test";
import { getAdBudgetCycle, getAdBudgetMonth, isAdBudgetMonth } from "./werbebudget";

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

test("Abschließende Prüfung ab dem letzten Monatstag und auch später möglich", () => {
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-30T22:59:59Z")).canReview, false);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2026-12-30T23:00:00Z")).canReview, true);
  assert.equal(getAdBudgetCycle("2026-12", new Date("2027-01-02T12:00:00Z")).canReview, true);
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
