import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Session } from "./types";

const COOKIE_NAME = "outrun_session";
const STATE_COOKIE = "outrun_oauth_state";

function key() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required in production");
  return createHash("sha256")
    .update(process.env.SESSION_SECRET ?? "outrun-development-secret-change-me")
    .digest();
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString();
}

export function encryptSession(session: Session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSession(value?: string): Session | null {
  if (!value) return null;
  try {
    const [iv, tag, encrypted] = value.split(".");
    if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString()) as Session;
  } catch {
    return null;
  }
}

export function readSession(request: NextRequest) {
  return decryptSession(request.cookies.get(COOKIE_NAME)?.value);
}

export function setSession(response: NextResponse, session: Session) {
  response.cookies.set(COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
    path: "/",
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export function setOAuthState(response: NextResponse, state: string) {
  response.cookies.set(STATE_COOKIE, encode(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
}

export function readOAuthState(request: NextRequest) {
  const value = request.cookies.get(STATE_COOKIE)?.value;
  return value ? decode(value) : null;
}

export function clearOAuthState(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}
