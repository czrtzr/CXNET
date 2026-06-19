import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/finance/yahoo";
import { cleanSymbol } from "@/lib/finance/symbol";

// Quote + fundamentals for one symbol. Session guarded so it is never an open
// proxy to Yahoo.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = cleanSymbol(new URL(request.url).searchParams.get("symbol"));
  if (!symbol) return NextResponse.json({ error: "Bad symbol" }, { status: 400 });

  const quote = await getQuote(symbol);
  if (!quote) return NextResponse.json({ error: "No data" }, { status: 404 });
  return NextResponse.json({ quote });
}
