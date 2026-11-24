import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script } from "node:vm";
import test from "node:test";
import { ModuleKind, transpileModule } from "typescript";
import * as cycles from "./werbebudget";

const code = transpileModule(readFileSync(resolve("lib/werbebudget-db.ts"), "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS },
}).outputText;

test("TTL-Index und Altbestände erhalten dieselbe Löschfrist; Initialisierung läuft nur einmal", async () => {
  const calls: { index?: unknown[]; updates: unknown[][]; indexes: number } = { updates: [], indexes: 0 };
  const collection = {
    createIndex: async (...args: unknown[]) => { calls.index = args; calls.indexes++; },
    find: () => ({ toArray: async () => [{ _id: "2026-12" }, { _id: "2027-01" }] }),
    updateOne: async (...args: unknown[]) => { calls.updates.push(args); },
  };
  const exports: { getAdBudgetRounds?: () => Promise<unknown> } = {};
  new Script(code).runInNewContext({ exports, require: (name: string) => {
    if (name === "@/lib/mongodb") return { getDatabase: async () => ({ collection: () => collection }) };
    if (name === "@/lib/werbebudget") return cycles;
    throw new Error(name);
  } });
  await Promise.all([exports.getAdBudgetRounds!(), exports.getAdBudgetRounds!()]);
  assert.equal(calls.indexes, 1);
  assert.equal(JSON.stringify(calls.index), JSON.stringify([{ expiresAt: 1 }, { expireAfterSeconds: 0, name: "werbebudget_retention" }]));
  assert.equal(calls.updates.length, 2);
  for (const [filter, update] of calls.updates as [{ _id: string; expiresAt: { $exists: boolean } }, { $set: { expiresAt: Date } }][]) {
    assert.equal(filter.expiresAt.$exists, false);
    assert.equal(update.$set.expiresAt.toISOString(), cycles.getAdBudgetExpiry(filter._id).toISOString());
  }
});

test("Ein fehlgeschlagener Retention-Setup wird beim nächsten Aufruf erneut versucht", async () => {
  let attempts = 0;
  const collection = {
    createIndex: async () => { if (++attempts === 1) throw new Error("temporär"); },
    find: () => ({ toArray: async () => [] }),
  };
  const exports: { getAdBudgetRounds?: () => Promise<unknown> } = {};
  new Script(code).runInNewContext({ exports, require: (name: string) => {
    if (name === "@/lib/mongodb") return { getDatabase: async () => ({ collection: () => collection }) };
    if (name === "@/lib/werbebudget") return cycles;
    throw new Error(name);
  } });
  await assert.rejects(exports.getAdBudgetRounds!(), /temporär/);
  assert.equal(await exports.getAdBudgetRounds!(), collection);
  assert.equal(attempts, 2);
});
