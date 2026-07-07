import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

function redirectUrl(path, request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const requestUrl = new URL(request.url);
  const baseUrl =
    configuredUrl ||
    (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1"
      ? "https://www.a4satta.com"
      : requestUrl.origin);

  return new URL(path, baseUrl);
}

export async function POST(request) {
  const response = NextResponse.redirect(redirectUrl("/", request));
  response.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  return response;
}
