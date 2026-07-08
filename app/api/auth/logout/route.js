import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

function redirectUrl(path, request) {
  const requestUrl = new URL(request.url);

  return new URL(path, requestUrl.origin);
}

export async function POST(request) {
  const response = NextResponse.redirect(redirectUrl("/", request));
  response.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  return response;
}
