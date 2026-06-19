import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/lib/finance/yahoo";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/finance/market";
import { cleanSymbol } from "@/lib/finance/symbol";

// Historical OHLC for the position charts. Session guarded.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const symbol = cleanSymbol(params.get("symbol"));
  const range = params.get("range") as HistoryRange | null;
  if (!symbol) return NextResponse.json({ error: "Bad symbol" }, { status: 400 });
  if (!range || !HISTORY_RANGES.includes(range))
    return NextResponse.json({ error: "Bad range" }, { status: 400 });

  const points = await getHistory(symbol, range);
  return NextResponse.json({ points });
}
