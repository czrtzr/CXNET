import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSymbol } from "@/lib/finance/yahoo";

// Symbol search for the Look Up control. Session guarded.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 1) return NextResponse.json({ hits: [] });

  const hits = await searchSymbol(query.slice(0, 40));
  return NextResponse.json({ hits });
}
