// The daily waitlist digest: counts by role for one day plus the total, never anyone's email
// address, nothing sent on quiet days, and the by-hand route only answers the secret key.
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { countsFor, createDigestHandler, digestEmail, sendDigest } from "../functions/api/digest.js";
import { createWaitlistHandler } from "../functions/api/waitlist.js";

function fakeD1() {
  const sqlite = new DatabaseSync(":memory:");
  return {
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

type Sent = { from: unknown; to: string; subject: string; text: string; html: string };
function fakeMail() {
  const sent: Sent[] = [];
  return { sent, binding: { send: async (message: Sent) => (sent.push(message), { messageId: `m${sent.length}` }) } };
}

const DAY1 = Date.UTC(2026, 10, 4, 12, 0, 0);
const DAY2 = Date.UTC(2026, 10, 5, 13, 0, 0);

async function join(db: ReturnType<typeof fakeD1>, at: number, email: string, role: string) {
  const handler = createWaitlistHandler({ now: () => at });
  const body = JSON.stringify({ email, role, birthYear: 1980, lang: "en" });
  const res = await handler({ request: new Request("https://pipodojo.com/api/waitlist", { method: "POST", body }), env: { DB: db } });
  expect(res.status).toBe(200);
}

describe("waitlist digest", () => {
  it("counts a day's sign-ups by role, and the total", async () => {
    const db = fakeD1();
    await join(db, DAY1, "a@x.com", "parent");
    await join(db, DAY1, "b@x.com", "parent");
    await join(db, DAY1, "c@x.com", "researcher");
    await join(db, DAY2, "d@x.com", "teacher");
    expect(await countsFor(db, "2026-11-04")).toEqual({
      day: "2026-11-04",
      byRole: { parent: 2, teacher: 0, researcher: 1 },
      newOnes: 3,
      total: 4,
    });
  });

  it("the morning digest covers yesterday, says the numbers, and never anyone's email", async () => {
    const db = fakeD1();
    const mail = fakeMail();
    await join(db, DAY1, "secret.person@x.com", "parent");
    await join(db, DAY1, "other@x.com", "teacher");
    const result = await sendDigest({ DB: db, DIGEST: mail.binding, DIGEST_TO: "me@example.com" }, { now: DAY2 });
    expect(result.sent).toBe(true);
    expect(mail.sent).toHaveLength(1);
    const [email] = mail.sent;
    expect(email!.to).toBe("me@example.com");
    expect(email!.subject).toBe("Pipodojo waitlist: 2 new yesterday (2 total)");
    expect(email!.text).toContain("1 parent, 1 teacher or school");
    for (const part of [email!.subject, email!.text, email!.html]) expect(part).not.toContain("secret.person");
  });

  it("sends nothing on a quiet day, or when the email isn't set up", async () => {
    const db = fakeD1();
    const mail = fakeMail();
    expect((await sendDigest({ DB: db, DIGEST: mail.binding, DIGEST_TO: "me@example.com" }, { now: DAY2 })).sent).toBe(false);
    await join(db, DAY1, "a@x.com", "parent");
    expect((await sendDigest({ DB: db, DIGEST: mail.binding }, { now: DAY2 })).reason).toBe("not set up");
    expect(mail.sent).toHaveLength(0);
  });

  it("reads well with one person", () => {
    const { subject, text } = digestEmail({ day: "2026-11-04", byRole: { parent: 1, teacher: 0, researcher: 0 }, newOnes: 1, total: 9 }, "yesterday");
    expect(subject).toBe("Pipodojo waitlist: 1 new yesterday (9 total)");
    expect(text).toContain("1 person joined yesterday (2026-11-04): 1 parent.");
  });

  it("sends today's counts by hand only with the secret key", async () => {
    const db = fakeD1();
    const mail = fakeMail();
    await join(db, DAY1, "a@x.com", "researcher");
    const env = { DB: db, DIGEST: mail.binding, DIGEST_TO: "me@example.com", DIGEST_KEY: "k".repeat(32) };
    const handler = createDigestHandler({ now: () => DAY1 + 3_600_000 });
    const call = (key?: string) =>
      handler({ request: new Request("https://pipodojo.com/api/waitlist/digest", { method: "POST", headers: key ? { "x-digest-key": key } : {} }), env });
    expect((await call()).status).toBe(403);
    expect((await call("wrong")).status).toBe(403);
    const res = await call("k".repeat(32));
    expect(res.status).toBe(200);
    expect(mail.sent[0]!.subject).toBe("Pipodojo waitlist: 1 new today so far (1 total)");
  });
});
