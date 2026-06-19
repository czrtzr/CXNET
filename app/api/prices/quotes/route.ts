import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMiniQuotes } from "@/lib/finance/yahoo";
import { cleanSymbol } from "@/lib/finance/symbol";

// Batch daily change for several symbols, used to annotate search results.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (new URL(request.url).searchParams.get("symbols") ?? "").split(",");
  const symbols = raw
    .map((s) => cleanSymbol(s))
    .filter((s): s is string => s != null)
    .slice(0, 10);
  if (symbols.length === 0) return NextResponse.json({ quotes: {} });

  const quotes = await getMiniQuotes(symbols);
  return NextResponse.json({ quotes });
}
