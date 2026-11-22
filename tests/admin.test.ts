// The waitlist dashboard: closed unless a real Cloudflare Access login is checked on the server
// (signature, audience, issuer, expiry), and safe with whatever text people typed (escaped in the
// page, defused in the CSV). Tokens are signed here with a throwaway RSA key.
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { createAccessCheck } from "../functions/admin/access.js";
import { createAdminHandler, csvCell } from "../functions/admin/dashboard.js";
import worker from "../worker/index.js";

const TEAM = "pipoteam.cloudflareaccess.com";
const AUD = "aud-live-123";
const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: `${AUD}, aud-staging-456` };

const keyPair = (await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
)) as CryptoKeyPair;
const otherPair = (await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
)) as CryptoKeyPair;
const publicJwk = { ...(await crypto.subtle.exportKey("jwk", keyPair.publicKey)), kid: "key-1" };

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const part = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

async function sign(claims: Record<string, unknown>, { kid = "key-1", alg = "RS256", key = keyPair.privateKey } = {}) {
  const head = part({ alg, kid, typ: "JWT" });
  const body = part(claims);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

const good = (more: Record<string, unknown> = {}) => ({
  aud: [AUD],
  iss: `https://${TEAM}`,
  email: "maker@example.com",
  exp: NOW / 1000 + 3600,
  iat: NOW / 1000,
  ...more,
});

function check() {
  const certs = vi.fn(async () => new Response(JSON.stringify({ keys: [publicJwk] })));
  return { certs, adminUser: createAccessCheck({ fetch: certs, now: () => NOW }) };
}

const req = (token?: string, { url = "https://pipodojo.com/admin", cookie = false } = {}) =>
  new Request(url, {
    headers: token ? (cookie ? { cookie: `other=1; CF_Authorization=${token}` } : { "cf-access-jwt-assertion": token }) : {},
  });

describe("access check", () => {
  it("lets in a signed-in person and gives their email", async () => {
    const { adminUser, certs } = check();
    expect(await adminUser(req(await sign(good())), env)).toBe("maker@example.com");
    // From the cookie too, and the keys are fetched once and kept.
    expect(await adminUser(req(await sign(good()), { cookie: true }), env)).toBe("maker@example.com");
    expect(certs).toHaveBeenCalledTimes(1);
    expect(certs).toHaveBeenCalledWith(`https://${TEAM}/cdn-cgi/access/certs`);
  });

  it("accepts any of the listed audiences (live and staging)", async () => {
    const { adminUser } = check();
    expect(await adminUser(req(await sign(good({ aud: "aud-staging-456" }))), env)).toBe("maker@example.com");
  });

  it("turns away tokens that are wrong in any way", async () => {
    const { adminUser } = check();
    const bad = [
      await sign(good({ aud: ["someone-else"] })),
      await sign(good({ iss: "https://evil.cloudflareaccess.com" })),
      await sign(good({ exp: NOW / 1000 - 3600 })),
      await sign(good({ nbf: NOW / 1000 + 3600 })),
      await sign(good({ email: undefined })),
      await sign(good(), { key: otherPair.privateKey }), // signed by someone else
      await sign(good(), { kid: "unknown" }),
      await sign(good(), { alg: "none" }),
      "not.a.token",
      "garbage",
    ];
    for (const token of bad) expect(await adminUser(req(token), env)).toBeNull();
    // A real token with its claims swapped for someone else's no longer matches its signature.
    const [head, , sig] = (await sign(good())).split(".");
    expect(await adminUser(req(`${head}.${part(good({ email: "intruder@example.com" }))}.${sig}`), env)).toBeNull();
    expect(await adminUser(req(), env)).toBeNull();
  });

  it("lets nobody in when it isn't set up", async () => {
    const { adminUser } = check();
    const token = await sign(good());
    expect(await adminUser(req(token), {})).toBeNull();
    expect(await adminUser(req(token), { ACCESS_TEAM_DOMAIN: TEAM })).toBeNull();
    expect(await adminUser(req(token), { ACCESS_AUD: AUD })).toBeNull();
  });

  it("turns away everyone if Access's keys can't be fetched", async () => {
    const adminUser = createAccessCheck({ fetch: async () => new Response("down", { status: 500 }), now: () => NOW });
    expect(await adminUser(req(await sign(good())), env)).toBeNull();
  });

  it("honors the local bypass only on localhost", async () => {
    const { adminUser } = check();
    const bypass = { DEV_ADMIN_BYPASS: "true" };
    expect(await adminUser(req(undefined, { url: "http://localhost:5173/admin" }), bypass)).toBe("local-dev");
    expect(await adminUser(req(undefined, { url: "https://pipodojo.com/admin" }), bypass)).toBeNull();
    expect(await adminUser(req(undefined, { url: "https://staging-pipodojo.nerdypunk.workers.dev/admin" }), bypass)).toBeNull();
  });
});

function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  return {
    sqlite,
    prepare(sql: string) {
      const make = (args: unknown[]) => {
        const stmt = sqlite.prepare(sql);
        return {
          bind: (...more: unknown[]) => make([...args, ...more]),
          first: async () => (stmt.get(...(args as never[])) as Record<string, unknown> | undefined) ?? null,
          all: async () => ({ results: stmt.all(...(args as never[])) }),
          run: async () => ({ meta: { changes: Number(stmt.run(...(args as never[])).changes) } }),
        };
      };
      return make([]);
    },
  };
}

function seeded() {
  const db = fakeD1();
  db.sqlite.exec(
    "CREATE TABLE waitlist (email TEXT NOT NULL, role TEXT NOT NULL, lang TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (email, role))",
  );
  const add = db.sqlite.prepare("INSERT INTO waitlist VALUES (?, ?, ?, ?)");
  add.run("ana@example.com", "parent", "es", "2026-11-21");
  add.run("ana@example.com", "teacher", "es", "2026-11-20");
  add.run("ken@example.jp", "researcher", "ja", "2026-11-01");
  add.run("<script>alert(1)</script>@x.co", "parent", "en", "2026-11-19");
  add.run("=cmd|'/c calc'!a1@x.co", "teacher", "en", "2026-11-18");
  return db;
}

const signedIn = createAdminHandler({ adminUser: async () => "maker@example.com", now: () => NOW });
const get = (path: string) => new Request(`https://pipodojo.com${path}`);

describe("waitlist dashboard", () => {
  it("is private without a login", async () => {
    const closed = createAdminHandler({ adminUser: async () => null });
    for (const path of ["/admin", "/admin/", "/admin/waitlist.csv"]) {
      const res = await closed({ request: get(path), env: { DB: seeded() } });
      expect(res.status).toBe(403);
      expect(await res.text()).not.toContain("ana@example.com");
    }
  });

  it("shows everyone, the counts, and escapes what people typed", async () => {
    const res = await signedIn({ request: get("/admin"), env: { DB: seeded() } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    const html = await res.text();
    expect(html).toContain("ana@example.com");
    expect(html).toContain("ken@example.jp");
    expect(html).toContain("Signed in as maker@example.com");
    expect(html).toContain("Everyone (5)");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;@x.co");
    // People counts once per address; today and the last 7 days by sign-up day.
    expect(html).toMatch(/<div class="num">4<\/div><div class="lbl">People<\/div>/);
    expect(html).toMatch(/<div class="num">1<\/div><div class="lbl">Today<\/div>/);
    expect(html).toMatch(/<div class="num">4<\/div><div class="lbl">Last 7 days<\/div>/);
  });

  it("shows one role at a time", async () => {
    const html = await (await signedIn({ request: get("/admin?role=researcher"), env: { DB: seeded() } })).text();
    expect(html).toContain("ken@example.jp");
    expect(html).not.toContain("ana@example.com");
    expect(html).toContain('href="/admin/waitlist.csv?role=researcher"');
  });

  it("downloads a CSV that spreadsheets read safely", async () => {
    const res = await signedIn({ request: get("/admin/waitlist.csv"), env: { DB: seeded() } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain('filename="pipodojo-waitlist.csv"');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // the BOM, for Excel
    const csv = new TextDecoder().decode(bytes); // (decoding drops the BOM)
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("email,role,lang,day");
    expect(lines).toHaveLength(6);
    expect(csv).toContain(`"'=cmd|'/c calc'!a1@x.co","teacher","en","2026-11-18"`);
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("-1")).toBe(`"'-1"`);
  });

  it("works on an empty database and 404s other admin paths", async () => {
    const res = await signedIn({ request: get("/admin"), env: { DB: fakeD1() } });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No one here yet.");
    expect((await signedIn({ request: get("/admin/secrets"), env: { DB: fakeD1() } })).status).toBe(404);
    expect((await signedIn({ request: new Request("https://pipodojo.com/admin", { method: "POST" }), env: { DB: fakeD1() } })).status).toBe(405);
  });

  it("is wired into the Worker, closed by default", async () => {
    const res = await worker.fetch(get("/admin"), { DB: seeded() });
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("ana@example.com");
  });
});
