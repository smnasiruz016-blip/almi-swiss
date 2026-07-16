import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// 🔴 KNOWN LEAK, DEFERRED ON PURPOSE — NOT an approval of this name.
// This cookie carries the ANCESTOR'S product name, two forks back, and this product
// sets it on every visitor's browser. It walked past the fork-hygiene gate for a day
// because BANNED held the HYPHENATED slug while this value uses an UNDERSCORE; the
// gate now generates every separator form, which is how this line got found.
//
// NOT renamed here because renaming the cookie LOGS OUT every live session: the
// browser keeps sending the old name and nothing reads it. That is a real, visible
// cost to real users, so it is the founder's call and its own change — do it in a
// quiet window, and consider reading both names for one release before dropping the
// old one.
//
// NOT a correctness bug: cookies are host-scoped, so this site and the ancestor's
// never collide. It is an identity leak — and the exact string the next fork clones
// into almi_swiss_session while meaning something else.
//
// The hygiene-allow marker below is what keeps the build green. It is a receipt, not
// a pardon: every OTHER occurrence of any ancestor slug, in any spelling, still fails.
const SESSION_COOKIE_NAME = "almi_norwegian_session"; // hygiene-allow — deferred rename, see above
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
