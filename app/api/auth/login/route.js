import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { makeSession, sessionCookieName, verifyPassword } from "@/lib/auth";
import User from "@/models/User";

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
  const form = await request.formData();
  await connectDB();
  const user = await User.findOne({ email: form.get("email") }).lean();
  const ok = user && (await verifyPassword(form.get("password") || "", user.password));
  if (!ok) return NextResponse.redirect(redirectUrl("/admin/login?error=1", request));

  const response = NextResponse.redirect(redirectUrl("/admin/dashboard", request));
  response.cookies.set(sessionCookieName(), makeSession(user._id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
