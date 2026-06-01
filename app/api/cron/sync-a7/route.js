import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncA7Results } from "@/lib/a7Sync.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CRON_SYNC_TIMEOUT_MS = 26000;

export async function GET(request) {
  const startedAt = Date.now();

  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && querySecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await withTimeout(
      syncA7Results({
        smart: true,
        windowMinutes: 120,
        fetchTimeoutMs: 12000
      }),
      CRON_SYNC_TIMEOUT_MS
    );

    revalidatePath("/", "page");

    const response = NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      report
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const status = error.name === "TimeoutError" ? 504 : 500;
    return NextResponse.json(
      {
        ok: false,
        elapsedMs: Date.now() - startedAt,
        error: error.message
      },
      { status }
    );
  }
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Cron sync exceeded ${timeoutMs}ms.`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
