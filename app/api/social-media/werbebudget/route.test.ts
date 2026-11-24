import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import test from "node:test";
import { NextRequest } from "next/server";
import { ModuleKind, transpileModule } from "typescript";
import * as cycles from "@/lib/werbebudget";
import * as policies from "@/lib/werbebudget-terms";
import type { AdBudgetApplication, AdBudgetRound } from "@/lib/werbebudget";

const requireModule = createRequire(resolve("package.json"));
const code = transpileModule(readFileSync(resolve("app/api/social-media/werbebudget/route.ts"), "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS },
}).outputText;

const application = (overrides: Partial<AdBudgetApplication> = {}): AdBudgetApplication => ({
  id: "application-1", userId: "user-1", username: "Autor", bookId: "0123456789abcdef01234567", bookTitle: "Mein Buch",
  socialHandle: "Instagram: @autor", notes: "Nachweise", status: "approved", createdAt: "2026-12-01", updatedAt: "2026-12-31",
  country: "AT", publicationConsent: { granted: true, updatedAt: "2026-12-01" },
  acceptance: { version: policies.AD_BUDGET_TERMS_VERSION, acceptedAt: "2026-12-01", eligibilityConfirmed: true, rightsConfirmed: true }, ...overrides,
});

function harness(options: { role?: "USER" | "ADMIN" | "SUPERADMIN"; guest?: boolean; now?: string; userId?: string; apps?: AdBudgetApplication[]; bookExists?: boolean } = {}) {
  const fixedNow = new Date(options.now ?? "2026-11-24T12:00:00Z");
  const round: AdBudgetRound = { _id: "2026-12", status: "open", revision: 0, expiresAt: cycles.getAdBudgetExpiry("2026-12"), applications: structuredClone(options.apps ?? []) };
  const account = options.guest ? null : { username: "Autor", role: options.role ?? "USER" };
  const userId = options.userId ?? "user-1";
  const writes: Record<string, unknown>[] = [];
  const collection = {
    findOne: async () => structuredClone(round),
    find: (filter: Record<string, unknown> = {}, projection?: { projection?: { applications?: { $elemMatch: { userId: string } } } }) => ({
      sort: () => ({ toArray: async () => {
        if (filter["applications.userId"] && !round.applications.some((a) => a.userId === filter["applications.userId"])) return [];
        if ((filter._id as { $ne?: string } | undefined)?.$ne === round._id) return [];
        const row = structuredClone(round);
        const ownId = projection?.projection?.applications?.$elemMatch.userId;
        if (ownId) row.applications = row.applications.filter((a) => a.userId === ownId).slice(0, 1);
        return [row];
      } }),
    }),
    updateOne: async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown>; $unset?: Record<string, unknown>; $setOnInsert?: unknown; $push?: { applications: AdBudgetApplication } }) => {
      const noMatch = { matchedCount: 0, modifiedCount: 0 };
      if (filter._id !== round._id) return noMatch;
      if (update.$setOnInsert) return { matchedCount: 1, modifiedCount: 0 };
      const excludedUser = (filter["applications.userId"] as { $ne?: string } | undefined)?.$ne;
      if (excludedUser && round.applications.some((a) => a.userId === excludedUser)) return noMatch;
      const entryMatch = (filter.applications as { $elemMatch?: { id: string; status: { $ne: string } } } | undefined)?.$elemMatch;
      const entry = typeof filter["applications.userId"] === "string"
        ? round.applications.find((a) => a.userId === filter["applications.userId"])
        : entryMatch ? round.applications.find((a) => a.id === entryMatch.id && a.status !== entryMatch.status.$ne) : undefined;
      if ((typeof filter["applications.userId"] === "string" || entryMatch) && !entry) return noMatch;
      writes.push(filter);
      if (update.$push) round.applications.push(structuredClone(update.$push.applications));
      if (entry) {
        const record = entry as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(update.$set ?? {})) record[key.replace("applications.$.", "")] = structuredClone(value);
        for (const key of Object.keys(update.$unset ?? {})) delete record[key.replace("applications.$.", "")];
      }
      round.revision++;
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  const exports: Record<string, (request: NextRequest) => Promise<Response>> = {};
  new Script(code).runInNewContext({
    exports, console, process,
    require: (name: string) => {
      if (name === "@/lib/server-auth") return {
        getServerAccount: async () => account,
        requireAdmin: async () => account?.role === "ADMIN" || account?.role === "SUPERADMIN" ? account : null,
      };
      if (name === "@/lib/werbebudget-db") return { getAdBudgetRounds: async () => collection };
      if (name === "@/lib/mongodb") return {
        getUsersCollection: async () => ({ findOne: async () => ({ _id: userId }) }),
        getBooksCollection: async () => ({
          findOne: async () => options.bookExists === false ? null : { title: "Mein Buch" },
          find: () => ({ project: () => ({ sort: () => ({ toArray: async () => [] }) }) }),
        }),
      };
      if (name === "@/lib/werbebudget") return { ...cycles,
        getAdBudgetMonth: () => cycles.getAdBudgetMonth(fixedNow),
        getAdBudgetCycle: (month: string) => cycles.getAdBudgetCycle(month, fixedNow),
      };
      if (name === "@/lib/werbebudget-terms") return policies;
      return requireModule(name);
    },
  });
  async function call(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: Record<string, unknown>) {
    return exports[method](new NextRequest("http://localhost/api/social-media/werbebudget", {
      method, ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
    }));
  }
  return { round, writes, call };
}

const validApplication = { month: "2026-12", bookId: "0123456789abcdef01234567", socialHandle: "@autor", notes: "",
  conditionsAccepted: true, termsVersion: policies.AD_BUDGET_TERMS_VERSION, eligibilityConfirmed: true,
  rightsConfirmed: true, country: "AT", publicationConsent: false };
const draw = { month: "2026-12", action: "draw" };

test("Bewerbung prüft Anmeldung, Monat, aktuelle Bedingungen, Berechtigung, Rechte und Buchzuordnung", async () => {
  for (const [options, body, status] of [
    [{ guest: true }, validApplication, 401],
    [{}, { ...validApplication, month: "2027-01" }, 409],
    [{}, { ...validApplication, conditionsAccepted: false }, 400],
    [{}, { ...validApplication, termsVersion: "alte-fassung" }, 409],
    [{}, { ...validApplication, eligibilityConfirmed: false }, 400],
    [{}, { ...validApplication, country: "US" }, 400],
    [{}, { ...validApplication, rightsConfirmed: false }, 400],
    [{ bookExists: false }, validApplication, 403],
    [{ role: "ADMIN" }, validApplication, 403],
    [{ role: "SUPERADMIN" }, validApplication, 403],
  ] as const) {
    const h = harness(options);
    assert.equal((await h.call("POST", body)).status, status);
    assert.equal(h.writes.length, 0);
  }
});

test("Ablehnung freiwilliger Gewinnernennung verhindert die Bewerbung nicht; Fassung und Serverzeit werden gespeichert", async () => {
  const h = harness();
  assert.equal((await h.call("POST", { ...validApplication, acceptedAt: "gefälscht" })).status, 200);
  const saved = h.round.applications[0];
  assert.equal(saved.acceptance?.version, policies.AD_BUDGET_TERMS_VERSION);
  assert.equal(saved.initialAcceptance?.version, policies.AD_BUDGET_TERMS_VERSION);
  assert.ok(Number.isFinite(Date.parse(saved.acceptance!.acceptedAt)));
  assert.equal(saved.country, "AT");
  assert.equal(saved.publicationConsent?.granted, false);
});

test("Ablehnungen verlangen einen dokumentierten Grund und speichern ihn für die betroffene Person", async () => {
  const h = harness({ role: "ADMIN", now: "2026-12-31T17:00:00Z", apps: [application({ status: "pending" })] });
  const review = { month: "2026-12", action: "review", applicationId: "application-1", status: "rejected" };
  assert.equal((await h.call("PATCH", review)).status, 400);
  assert.equal(h.writes.length, 0);
  assert.equal((await h.call("PATCH", { ...review, reason: "Nur 7 unterschiedliche Kommentare nachgewiesen." })).status, 200);
  assert.equal(h.round.applications[0].reviewReason, "Nur 7 unterschiedliche Kommentare nachgewiesen.");
});

test("Nachweisergänzungen bewahren den ursprünglichen Zustimmungsbeleg", async () => {
  const original = application().acceptance!;
  const h = harness({ apps: [application({ initialAcceptance: original })] });
  assert.equal((await h.call("PUT", { ...validApplication, notes: "Neue Nachweise" })).status, 200);
  assert.deepEqual(h.round.applications[0].initialAcceptance, original);
  assert.equal(h.round.applications[0].notes, "Neue Nachweise");
  assert.equal(h.round.applications[0].status, "pending");
});

test("Auch parallele Bewerbungen desselben Kontos ergeben nur eine Teilnahme", async () => {
  const h = harness();
  const responses = await Promise.all([h.call("POST", validApplication), h.call("POST", validApplication)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(h.round.applications.length, 1);
});

test("Neue Bewerbungen und Änderungen werden genau ab 18 Uhr Wiener Zeit gesperrt", async () => {
  for (const method of ["POST", "PUT"] as const) {
    const h = harness({ now: "2026-12-31T17:00:00Z", apps: [application()] });
    assert.equal((await h.call(method, validApplication)).status, 409);
    assert.equal(h.writes.length, 0);
  }
});

test("Nur Admins dürfen nach Bewerbungsschluss prüfen", async () => {
  const review = { month: "2026-12", action: "review", applicationId: "application-1", status: "approved" };
  for (const options of [{ guest: true }, { role: "USER" as const }, { role: "ADMIN" as const }]) {
    const h = harness({ ...options, apps: [application({ status: "pending" })] });
    assert.ok((await h.call("PATCH", review)).status >= 400);
    assert.equal(h.writes.length, 0);
  }
  const h = harness({ role: "ADMIN", now: "2026-12-31T17:00:00Z", apps: [application({ status: "pending" })] });
  assert.equal((await h.call("PATCH", review)).status, 200);
  assert.equal(h.round.applications[0].status, "approved");
});

test("Die Ziehungsfunktion bleibt auch für Admins unzugänglich", async () => {
  const h = harness({ role: "ADMIN", apps: [application()] });
  assert.equal((await h.call("PATCH", draw)).status, 400);
  assert.equal(h.writes.length, 0);
});

test("Alte Monatsbewerbungen können nicht neu angelegt oder bearbeitet werden", async () => {
  const h = harness({ now: "2027-01-01T12:00:00Z", apps: [application()] });
  assert.equal((await h.call("POST", validApplication)).status, 409);
  assert.equal((await h.call("PUT", validApplication)).status, 409);
  assert.equal(h.writes.length, 0);
});

test("Ein Rückzug entfernt Nachweise und Profil, widerruft Gewinnernennung und erhält den minimalen Beleg", async () => {
  const h = harness({ apps: [application()] });
  assert.equal((await h.call("DELETE", { month: "2026-12" })).status, 200);
  const saved = h.round.applications[0];
  assert.equal(saved.status, "withdrawn");
  assert.equal(saved.notes, "");
  assert.equal(saved.socialHandle, "");
  assert.equal(saved.country, undefined);
  assert.equal(saved.publicationConsent?.granted, false);
  assert.equal(saved.acceptance?.version, policies.AD_BUDGET_TERMS_VERSION);
  assert.ok(saved.withdrawnAt);
});

test("Andere Konten dürfen weder die Bewerbung zurückziehen noch die Einwilligung ändern", async () => {
  const h = harness({ userId: "anderes-konto", apps: [application()] });
  assert.equal((await h.call("DELETE", { month: "2026-12", userId: "user-1" })).status, 404);
  assert.equal((await h.call("PATCH", { month: "2026-12", action: "revoke-publication", userId: "user-1" })).status, 404);
  assert.equal(h.writes.length, 0);
});

test("Gewinnernennung kann auch nach Bewerbungsschluss ohne Rückzug widerrufen werden", async () => {
  const h = harness({ now: "2026-12-31T18:00:00Z", apps: [application()] });
  assert.equal((await h.call("PATCH", { month: "2026-12", action: "revoke-publication" })).status, 200);
  assert.equal(h.round.applications[0].publicationConsent?.granted, false);
  assert.equal(h.round.applications[0].status, "approved");
  assert.equal(h.round.applications[0].notes, "Nachweise");
});

test("Zurückgezogene Bewerbung kann vor Fristende erneut bestätigt, aber nicht vom Admin freigegeben werden", async () => {
  const h = harness({ apps: [application({ status: "withdrawn", withdrawnAt: "2026-11-24" })] });
  assert.equal((await h.call("PUT", validApplication)).status, 200);
  assert.equal(h.round.applications.length, 1);
  assert.equal(h.round.applications[0].status, "pending");
  assert.equal(h.round.applications[0].withdrawnAt, undefined);
  const admin = harness({ role: "ADMIN", now: "2026-12-31T17:00:00Z", apps: [application({ status: "withdrawn" })] });
  assert.equal((await admin.call("PATCH", { month: "2026-12", action: "review", applicationId: "application-1", status: "approved" })).status, 409);
  assert.equal(admin.round.applications[0].status, "withdrawn");
});

test("Öffentliche und eigene Ansichten geben keine fremden Bewerbungen preis", async () => {
  const guest = harness({ guest: true, apps: [application()] });
  const response = await guest.call("GET");
  const publicData = await response.json();
  assert.equal(publicData.myApplication, null);
  assert.deepEqual(publicData.myPreviousApplications, []);
  assert.equal(publicData.applications, undefined);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const own = harness({ now: "2027-01-02T12:00:00Z", apps: [application(), application({ id: "other", userId: "other", username: "Andere Person" })] });
  const ownData = await (await own.call("GET")).json();
  assert.equal(ownData.myPreviousApplications.length, 1);
  assert.equal(ownData.myPreviousApplications[0].application.username, "Autor");
  assert.ok(!JSON.stringify(ownData).includes("Andere Person"));
});
