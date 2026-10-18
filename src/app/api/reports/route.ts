
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Authentication required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return errorResponse("Provide a valid month in YYYY-MM format.", 400);
  }

  const [year, monthNumber] = month.split("-").map(Number);

  const start = `${month}-01`;
  const end = new Date(
    Date.UTC(year, monthNumber, 1),
  )
    .toISOString()
    .slice(0, 10);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      "id, title, type, amount, category, transaction_date, notes, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lt("transaction_date", end)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Monthly report query failed:", error.code);
    return errorResponse("Unable to load monthly report.", 500);
  }

  let incomeCents = 0;
  let expenseCents = 0;

  const categories = new Map<string, number>();

  for (const transaction of transactions ?? []) {
    const cents = Math.round(Number(transaction.amount) * 100);

    if (!Number.isSafeInteger(cents) || cents < 0) {
      return errorResponse(
        "Invalid transaction amount in stored data.",
        500,
      );
    }

    if (transaction.type === "income") {
      incomeCents += cents;
    } else if (transaction.type === "expense") {
      expenseCents += cents;

      const category = transaction.category || "Uncategorized";
      categories.set(
        category,
        (categories.get(category) ?? 0) + cents,
      );
    }
  }

  if (
    !Number.isSafeInteger(incomeCents) ||
    !Number.isSafeInteger(expenseCents)
  ) {
    return errorResponse("Report totals exceed supported limits.", 500);
  }

  const spendingCategories = Array.from(
    categories,
    ([category, cents]) => ({
      category,
      amount: cents / 100,
    }),
  ).sort((a, b) => b.amount - a.amount);

  return NextResponse.json(
    {
      month,
      totals: {
        income: incomeCents / 100,
        expenses: expenseCents / 100,
        netCashFlow: (incomeCents - expenseCents) / 100,
      },
      spendingCategories,
      transactions: transactions ?? [],
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
