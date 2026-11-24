import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Script } from "node:vm";
import test from "node:test";
import { ObjectId } from "mongodb";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";

const requireModule = createRequire(import.meta.url);
const fixtureUserId = new ObjectId();

// Execute the real route/helper with isolated DB and storage dependencies.
// An unmocked application dependency fails instead of reaching external services.
function load(file, mocks = {}) {
  const code = transpileModule(readFileSync(resolve(file), "utf8"), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Script(code, { filename: file }).runInNewContext({
    exports, Request, Response, Headers, URL, Buffer, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder,
    console: { ...console, error() {} },
    process: { env: { JWT_SECRET: "test-only-session-secret-never-used-in-production" } },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith("@/")) throw new Error(`Missing test mock: ${name}`);
      return requireModule(name);
    },
  });
  return exports;
}

async function sessionHarness(user) {
  let token;
  const storedUser = user ? { _id: fixtureUserId, ...user } : null;
  const auth = load("lib/server-auth.ts", {
    react: { cache: (fn) => fn },
    "next/headers": { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    "@/lib/mongodb": { getUsersCollection: async () => ({ findOne: async () => storedUser }) },
  });
  token = await auth.createAuthToken({ username: "Test", email: "old@example.invalid", role: "ADMIN", userId: fixtureUserId.toString() });
  return { auth, token };
}

test("sessions use the current role and email instead of stale JWT claims", async () => {
  const { auth } = await sessionHarness({ username: "Test", email: "new@example.invalid", role: "USER" });
  const account = await auth.getServerAccount();
  assert.equal(account.role, "USER");
  assert.equal(account.email, "new@example.invalid");
});

for (const [label, user] of [
  ["deleted accounts", null],
  ["deactivated accounts", { username: "Test", role: "ADMIN", status: "deactivated" }],
  ["sessions revoked by a password change", { username: "Test", role: "ADMIN", sessionVersion: 1 }],
]) {
  test(`sessions reject ${label}`, async () => {
    const { auth } = await sessionHarness(user);
    assert.equal(await auth.getServerAccount(), null);
  });
}

test("normal admins cannot pass the superadmin guard", async () => {
  const { auth } = await sessionHarness({ username: "Test", email: "test@example.invalid", role: "ADMIN" });
  assert.equal(await auth.requireSuperAdmin(), null);
  assert.equal((await auth.requireAdmin()).role, "ADMIN");
});

test("superadmins retain their access", async () => {
  const { auth } = await sessionHarness({ username: "Test", email: "test@example.invalid", role: "SUPERADMIN" });
  assert.equal((await auth.requireSuperAdmin()).role, "SUPERADMIN");
});

test("new logins work after the session version has increased", async () => {
  const user = { username: "Test", email: "test@example.invalid", role: "USER", sessionVersion: 2 };
  const { auth } = await sessionHarness(user);
  const token = await auth.createAuthToken(user);
  assert.equal((await auth.getAccountFromToken(token)).username, "Test");
});

test("reusing a deleted username does not revive the previous owner's session", async () => {
  const { auth } = await sessionHarness({ _id: new ObjectId(), username: "Test", email: "old@example.invalid", role: "USER" });
  assert.equal(await auth.getServerAccount(), null);
});

test("a database outage returns 503 instead of logging the user out", async () => {
  const route = load("app/api/auth/check/route.ts", {
    "@/lib/server-auth": { getServerAccount: async () => { throw new Error("DB unavailable"); } },
  });
  assert.equal((await route.GET()).status, 503);
});

test("logout expires the HTTP-only session and impersonation cookies", async () => {
  const route = load("app/api/auth/logout/route.ts");
  const response = await route.POST();
  assert.equal(response.status, 200);
  for (const name of ["auth_token", "logged_in_account", "impersonation_return_token", "impersonating_as"]) {
    const cookie = response.cookies.get(name);
    assert.equal(cookie.value, "");
    assert.equal(cookie.maxAge, 0);
  }
  assert.equal(response.cookies.get("auth_token").httpOnly, true);
});

function mp3Harness(account) {
  let deleted = 0;
  let updated = 0;
  const route = load("app/api/bucharena/sprecher/[id]/mp3/route.ts", {
    "@/lib/server-auth": {
      getServerAccount: async () => account,
      requireAdmin: async () => account && ["ADMIN", "SUPERADMIN"].includes(account.role) ? account : null,
    },
    "@/lib/bucharena-db": { getBucharenaSprecherCollection: async () => ({
      findOne: async () => ({ mp3Files: [{ path: "fixture.mp3" }] }),
      updateOne: async () => { updated++; },
    }) },
    "@/lib/bucharena-webdav": { davDelete: async () => { deleted++; } },
  });
  return { route, writes: () => deleted + updated };
}
const mp3Context = { params: Promise.resolve({ id: "0123456789abcdef01234567" }) };

test("anonymous MP3 uploads are rejected before reading files or storage", async () => {
  const h = mp3Harness(null);
  assert.equal((await h.route.POST(new Request("http://test.invalid", { method: "POST" }), mp3Context)).status, 401);
  assert.equal(h.writes(), 0);
});

for (const role of [null, "USER"]) {
  test(`MP3 deletion rejects ${role ?? "anonymous visitors"}`, async () => {
    const h = mp3Harness(role ? { username: "Test", role } : null);
    assert.equal((await h.route.DELETE(new Request("http://test.invalid?mp3Index=0"), mp3Context)).status, 403);
    assert.equal(h.writes(), 0);
  });
}

test("MP3 deletion validates its index and still permits admins", async () => {
  const h = mp3Harness({ username: "Test", role: "ADMIN" });
  for (const value of ["NaN", "1.5", "0abc", "-1", ""]) {
    assert.equal((await h.route.DELETE(new Request(`http://test.invalid?mp3Index=${value}`), mp3Context)).status, 400);
  }
  assert.equal(h.writes(), 0);
  assert.equal((await h.route.DELETE(new Request("http://test.invalid?mp3Index=0"), mp3Context)).status, 200);
  assert.equal(h.writes(), 2);
});

test("a visitor cannot subscribe or reactivate someone else's newsletter address", async () => {
  const route = load("app/api/newsletter/subscribers/route.ts", {
    "@/lib/server-auth": { requireAdmin: async () => null },
    "@/lib/newsletter": { getSubscribersCollection: async () => { throw new Error("DB must not be accessed"); } },
  });
  assert.equal((await route.POST(new Request("http://test.invalid", { method: "POST" }))).status, 403);
});

const zirkel = { _id: new ObjectId(), veranstalterUsername: "Author", typ: "betaleser", agbPflicht: true };
for (const [label, participant, accepted, expected] of [
  ["no participation", null, true, false],
  ["withdrawn participation", { abgebrochen: true }, true, false],
  ["missing NDA consent", {}, false, false],
  ["active participation with consent", {}, true, true],
]) {
  test(`confidential book circle access: ${label}`, async () => {
    const access = load("lib/buchzirkel-access.ts", {
      "@/lib/mongodb": {
        getBuchzirkelTeilnahmenCollection: async () => ({ findOne: async () => participant }),
        getBuchzirkelBewerbungenCollection: async () => ({ findOne: async () => ({ agbAkzeptiert: accepted }) }),
      },
    });
    assert.equal(await access.canAccessBuchzirkel(zirkel, "Reader"), expected);
  });
}

test("authors can read their own manuscripts without a participant record", async () => {
  const access = load("lib/buchzirkel-access.ts", { "@/lib/mongodb": {} });
  assert.equal(await access.canAccessBuchzirkel(zirkel, "Author"), true);
});

test("calendar validation rejects impossible dates and times", () => {
  const calendar = load("lib/kalender.ts");
  for (const date of ["2026-99-99", "2026-02-29", "2026-04-31", "invalid"]) assert.equal(calendar.isValidCalendarDate(date), false);
  for (const date of ["2028-02-29", "2026-11-24"]) assert.equal(calendar.isValidCalendarDate(date), true);
  for (const time of ["99:99", "24:00", "12:60", "1:30"]) assert.equal(calendar.isValidCalendarTime(time), false);
  for (const time of ["00:00", "23:59", "12:30"]) assert.equal(calendar.isValidCalendarTime(time), true);
});

test("the calendar endpoint rejects invalid dates before writing a record", async () => {
  const calendar = load("lib/kalender.ts");
  let writes = 0;
  const route = load("app/api/kalender/create/route.ts", {
    "@/lib/server-auth": { getServerAccount: async () => ({ username: "Test", role: "USER" }) },
    "@/lib/kalender": calendar,
    "@/lib/lesezeichen": { awardTerminErstellt: async () => 0 },
    "@/lib/mongodb": { getKalenderCollection: async () => ({ insertOne: async () => { writes++; } }) },
  });
  const response = await route.POST(new Request("http://test.invalid", {
    method: "POST", body: JSON.stringify({ title: "Test", description: "Test", category: "Sonstiges", date: "2026-99-99" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test("a confidential file is not fetched when access is denied", async () => {
  let downloads = 0;
  const route = load("app/api/buchzirkel/[id]/datei/[dateiId]/route.ts", {
    "@/lib/server-auth": { getServerAccount: async () => ({ username: "Reader", role: "USER" }) },
    "@/lib/mongodb": { getBuchzirkelCollection: async () => ({ findOne: async () => zirkel }) },
    "@/lib/buchzirkel-access": { canAccessBuchzirkel: async () => false },
    "@/lib/bucharena-webdav": { davGet: async () => { downloads++; } },
  });
  const response = await route.GET(new Request("http://test.invalid"), {
    params: Promise.resolve({ id: zirkel._id.toString(), dateiId: "file" }),
  });
  assert.equal(response.status, 403);
  assert.equal(downloads, 0);
});
