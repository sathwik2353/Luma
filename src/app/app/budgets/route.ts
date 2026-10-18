
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const budgetSchema = z.object({
  category: z.string().trim().min(1).max(60),
  amount: z.number().finite().positive().max(999999999999.99),
});

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Please sign in to view budgets.", 401);
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("id, category, amount, created_at, updated_at")
    .eq("user_id", user.id)
    .order("category", { ascending: true });

  if (error) {
    console.error("GET /api/budgets:", error.message);
    return errorResponse("Unable to load budgets.", 500);
  }

  return NextResponse.json(
    { budgets: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Please sign in to save budgets.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = budgetSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Enter a valid category and positive budget amount.", 400);
  }

  const { category, amount } = parsed.data;

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        category,
        amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" },
    )
    .select("id, category, amount, created_at, updated_at")
    .single();

  if (error) {
    console.error("PUT /api/budgets:", error.message);
    return errorResponse("Unable to save budget.", 500);
  }

  return NextResponse.json(
    { budget: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Please sign in to remove budgets.", 401);
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category")?.trim();

  if (!category || category.length > 60) {
    return errorResponse("A valid budget category is required.", 400);
  }

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category", category);

  if (error) {
    console.error("DELETE /api/budgets:", error.message);
    return errorResponse("Unable to remove budget.", 500);
  }

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
