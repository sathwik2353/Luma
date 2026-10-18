
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";


const transactionColumns =
  "id, title, category, type, amount, transaction_date, notes, created_at, updated_at";

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const dateSchema = z
  .string()
  .refine(isValidDate, "Enter a valid date in YYYY-MM-DD format.");

const transactionFields = {
  title: z
    .string()
    .trim()
    .min(1, "Enter a transaction title.")
    .max(120, "Title must be 120 characters or fewer."),
  category: z
    .string()
    .trim()
    .min(1, "Choose a category.")
    .max(60, "Category must be 60 characters or fewer."),
  type: z.enum(["income", "expense"]),
  amount: z.coerce
    .number()
    .finite()
    .positive("Amount must be greater than zero.")
    .max(999999999999.99, "Amount is too large.")
    .refine(
      (value) => Math.round(value * 100) === value * 100,
      "Amount can have at most two decimal places."
    ),
  transaction_date: dateSchema.optional(),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or fewer.")
    .nullable()
    .optional(),
};

const createTransactionSchema = z.object(transactionFields);

const updateTransactionSchema = z
  .object({
    id: z.string().uuid("Invalid transaction ID."),
    ...Object.fromEntries(
      Object.entries(transactionFields).map(([key, value]) => [
        key,
        value.optional(),
      ])
    ),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== "id"),
    "Provide at least one field to update."
  );

const idSchema = z.string().uuid("Invalid transaction ID.");

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

// GET /api/transactions
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!supabase || !user) {
      return jsonError("Please sign in to view your transactions.", 401);
    }

    const { data, error } = await supabase
      .from("transactions")
      .select(transactionColumns)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET transactions failed:", error.code);
      return jsonError("Could not load transactions.", 500);
    }

    return Response.json(
      { transactions: data ?? [] },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return jsonError("An unexpected error occurred.", 500);
  }
}

// POST /api/transactions
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!supabase || !user) {
      return jsonError("Please sign in to add a transaction.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Please check the transaction details.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        title: input.title,
        category: input.category,
        type: input.type,
        amount: input.amount,
        transaction_date:
          input.transaction_date ?? new Date().toISOString().slice(0, 10),
        notes: input.notes ?? null,
      })
      .select(transactionColumns)
      .single();

    if (error) {
      console.error("POST transaction failed:", error.code);
      return jsonError("Could not create the transaction.", 500);
    }

    return Response.json({ transaction: data }, { status: 201 });
  } catch {
    return jsonError("An unexpected error occurred.", 500);
  }
}

// PATCH /api/transactions
// JSON body: { "id": "<uuid>", "title": "Updated title" }
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!supabase || !user) {
      return jsonError("Please sign in to edit a transaction.", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Please check the transaction details.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id, ...fields } = parsed.data;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(transactionColumns)
      .maybeSingle();

    if (error) {
      console.error("PATCH transaction failed:", error.code);
      return jsonError("Could not update the transaction.", 500);
    }

    if (!data) {
      return jsonError("Transaction not found.", 404);
    }

    return Response.json({ transaction: data });
  } catch {
    return jsonError("An unexpected error occurred.", 500);
  }
}

// DELETE /api/transactions?id=<uuid>
export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!supabase || !user) {
      return jsonError("Please sign in to delete a transaction.", 401);
    }

    const id = new URL(request.url).searchParams.get("id");
    const parsedId = idSchema.safeParse(id);

    if (!parsedId.success) {
      return jsonError("A valid transaction ID is required.", 400);
    }

    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("DELETE transaction failed:", error.code);
      return jsonError("Could not delete the transaction.", 500);
    }

    if (!data) {
      return jsonError("Transaction not found.", 404);
    }

    return Response.json({ success: true, id: data.id });
  } catch {
    return jsonError("An unexpected error occurred.", 500);
  }
}
