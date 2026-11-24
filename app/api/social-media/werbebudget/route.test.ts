import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import test from "node:test";
import { NextRequest } from "next/server";
import { ModuleKind, transpileModule } from "typescript";
import type { AdBudgetApplication, AdBudgetRound } from "@/lib/werbebudget";

const requireModule = createRequire(resolve("package.json"));
const code = transpileModule(readFileSync(resolve("app/api/social-media/werbebudget/route.ts"), "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS },
}).outputText;

const application = (overrides: Partial<AdBudgetApplication> = {}): AdBudgetApplication => ({
  id: "application-1", userId: "user-1", username: "Autor", bookId: "0123456789abcdef01234567", bookTitle: "Mein Buch",
  socialHandle: "Instagram: @autor", notes: "", status: "approved", createdAt: "2026-12-01", updatedAt: "2026-12-31", ...overrides,
});

function harness(options: { role?: "USER" | "ADMIN"; guest?: boolean; canReview?: boolean; currentMonth?: string; apps?: AdBudgetApplication[]; bookExists?: boolean } = {}) {
  const round: AdBudgetRound = { _id: "2026-12", status: "open", revision: 0, applications: options.apps ?? [] };
  const account = options.guest ? null : { username: "Autor", role: options.role ?? "USER" };
  const writes: Record<string, unknown>[] = [];
  const collection = {
    findOne: async () => structuredClone(round),
    updateOne: async (filter: Record<string, unknown>, update: { $set?: Partial<AdBudgetRound>; $setOnInsert?: unknown; $push?: { applications: AdBudgetApplication } }) => {
      if (update.$setOnInsert) return { modifiedCount: 0 };
      if (round.status !== "open" || (filter.revision !== undefined && filter.revision !== round.revision)) return { modifiedCount: 0 };
      const excludedUser = (filter["applications.userId"] as { $ne?: string } | undefined)?.$ne;
      if (excludedUser && round.applications.some((a) => a.userId === excludedUser)) return { modifiedCount: 0 };
      writes.push(filter);
      if (update.$push) round.applications.push(update.$push.applications);
      round.revision++;
      return { modifiedCount: 1 };
    },
  };
  const exports: Record<string, (request: NextRequest) => Promise<Response>> = {};
  new Script(code).runInNewContext({
    exports, console, process,
    require: (name: string) => {
      if (name === "@/lib/server-auth") return {
        getServerAccount: async () => account,
        requireAdmin: async () => account?.role === "ADMIN" ? account : null,
      };
      if (name === "@/lib/mongodb") return {
        getDatabase: async () => ({ collection: () => collection }),
        getUsersCollection: async () => ({ findOne: async () => ({ _id: "user-1" }) }),
        getBooksCollection: async () => ({ findOne: async () => options.bookExists === false ? null : { title: "Mein Buch" } }),
      };
      if (name === "@/lib/werbebudget") return {
        getAdBudgetMonth: () => options.currentMonth ?? "2026-12",
        getAdBudgetCycle: () => ({ canReview: options.canReview ?? true }),
        isAdBudgetMonth: (month: unknown) => month === "2026-12",
      };
      return requireModule(name);
    },
  });
  async function call(method: "POST" | "PUT" | "PATCH", body: Record<string, unknown>) {
    return exports[method](new NextRequest("http://localhost/api/social-media/werbebudget", {
      method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
    }));
  }
  return { round, writes, call };
}

const validApplication = { month: "2026-12", bookId: "0123456789abcdef01234567", socialHandle: "@autor", conditionsAccepted: true };
const draw = { month: "2026-12", action: "draw" };

test("Bewerbung erfordert Anmeldung, aktuellen Monat, Zustimmung und ein eigenes Buch", async () => {
  for (const [options, body, status] of [
    [{ guest: true }, validApplication, 401],
    [{}, { ...validApplication, month: "2027-01" }, 409],
    [{}, { ...validApplication, conditionsAccepted: false }, 400],
    [{ bookExists: false }, validApplication, 403],
  ] as const) {
    const h = harness(options);
    assert.equal((await h.call("POST", body)).status, status);
    assert.equal(h.writes.length, 0);
  }
});

test("Auch parallele Bewerbungen desselben Kontos ergeben nur eine Teilnahme", async () => {
  const h = harness();
  const responses = await Promise.all([h.call("POST", validApplication), h.call("POST", validApplication)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(h.round.applications.length, 1);
  assert.equal(h.round.applications[0].userId, "user-1");
});

test("Nur Admins dürfen prüfen; vor Monatsende bleibt die Runde unverändert", async () => {
  for (const options of [{ guest: true }, { role: "USER" as const }, { role: "ADMIN" as const, canReview: false }]) {
    const h = harness({ ...options, apps: [application()] });
    assert.ok((await h.call("PATCH", draw)).status >= 400);
    assert.ok((await h.call("PATCH", { month: "2026-12", action: "review", applicationId: "application-1", status: "approved" })).status >= 400);
    assert.equal(h.writes.length, 0);
  }
});

test("Die Ziehungsfunktion steht auch Admins noch nicht zur Verfügung", async () => {
  const h = harness({ role: "ADMIN", apps: [application()] });
  assert.equal((await h.call("PATCH", draw)).status, 400);
  assert.equal(h.writes.length, 0);
  assert.equal(h.round.status, "open");
});

test("Nach Monatswechsel können alte Bewerbungen weder neu angelegt noch bearbeitet werden", async () => {
  const h = harness({ currentMonth: "2027-01", apps: [application()] });
  assert.equal((await h.call("POST", validApplication)).status, 409);
  assert.equal((await h.call("PUT", validApplication)).status, 409);
  assert.equal(h.writes.length, 0);
});
