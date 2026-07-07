import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request) {
  const response = NextResponse.redirect(new URL("/", siteUrl));
  response.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  return response;
}