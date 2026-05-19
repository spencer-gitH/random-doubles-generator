import { NextResponse } from "next/server";
import { LEAGUE } from "@/lib/league";
import { syncSeason } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { since?: string; until?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const since = body.since ? new Date(body.since) : undefined;
  const until = body.until ? new Date(body.until) : undefined;

  try {
    const report = await syncSeason(LEAGUE.currentSeasonId, {
      trigger: "backfill",
      since,
      until,
    });
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
