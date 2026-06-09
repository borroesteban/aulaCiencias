import type { CookieOptions } from "express";

export const authCookieName = "aulaciencias_session";

export function getAuthCookieOptions(): CookieOptions {
  const secureCookie =
    process.env.AUTH_COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === "production"
      : process.env.AUTH_COOKIE_SECURE === "true";

  return {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };
}
