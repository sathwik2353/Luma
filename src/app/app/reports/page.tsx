
"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

type Transaction = {
  id: string;
  title: string;
  type: "income" | "expense";
  amount: number | string;
  category: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Report = {
  month: string;
  totals: {
    income: number;
    expenses: number;
    netCashFlow: number;
  };
  spendingCategories: {
    category: string;
    amount: number;
  }[];
  transactions: Transaction[];
};

function getCurrentMonth(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ReportsPage() {
  const [month, setMonth] = useState("");
  const [maxMonth, setMaxMonth] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = getCurrentMonth();

    setMonth(current);
    setMaxMonth(current);
  }, []);

  const loadReport = useCallback(async () => {
    if (!month) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/reports?month=${encodeURIComponent(month)}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load your report.");
      }

      setReport(data as Report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (!month) return;

    void loadReport();
  }, [month, loadReport]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            LUMA / INSIGHTS
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Monthly reports
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Understand your income, spending, and cash flow.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-500">
          Select month

          <input
            type="month"
            value={month}
            max={maxMonth || undefined}
            disabled={!month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}

          <button
            type="button"
            onClick={() => void loadReport()}
            className="ml-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="rounded-2xl border border-gray-200 p-8 text-sm text-gray-500"
          role="status"
        >
          Loading your report...
        </div>
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard
              title="Total income"
              amount={report.totals.income}
              tone="green"
            />

            <SummaryCard
              title="Total expenses"
              amount={report.totals.expenses}
              tone="red"
            />

            <SummaryCard
              title="Net cash flow"
              amount={report.totals.netCashFlow}
              tone="neutral"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">
                Spending breakdown
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Expenses grouped by category.
              </p>

              {report.spendingCategories.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500">
                  No expenses recorded for this month.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {report.spendingCategories.map((item) => {
                    const percentage =
                      report.totals.expenses > 0
                        ? Math.min(
                            100,
                            (item.amount / report.totals.expenses) * 100,
                          )
                        : 0;

                    return (
                      <div key={item.category}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium">
                            {item.category}
                          </span>

                          <span className="text-gray-500">
                            {formatMoney(item.amount)}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <p className="mt-1 text-xs text-gray-400">
                          {percentage.toFixed(1)}% of expenses
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">
                Monthly summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your financial position for the selected month.
              </p>

              <div className="mt-6 divide-y divide-gray-100">
                <SummaryRow
                  label="Transactions"
                  value={String(report.transactions.length)}
                />

                <SummaryRow
                  label="Income"
                  value={formatMoney(report.totals.income)}
                />

                <SummaryRow
                  label="Expenses"
                  value={formatMoney(report.totals.expenses)}
                />

                <SummaryRow
                  label="Savings from cash flow"
                  value={formatMoney(report.totals.netCashFlow)}
                  emphasize
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="border-b border-gray-100 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Transactions</h2>

              <p className="mt-1 text-sm text-gray-500">
                Activity recorded during the selected month.
              </p>
            </div>

            {report.transactions.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">
                No transactions found for this month.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">
                        Description
                      </th>
                      <th className="px-5 py-3 font-medium">
                        Category
                      </th>
                      <th className="px-5 py-3 text-right font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {report.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                          {transaction.transaction_date}
                        </td>

                        <td className="min-w-40 px-5 py-4">
                          {transaction.title || "Transaction"}

                          {transaction.notes && (
                            <p className="mt-1 text-xs text-gray-400">
                              {transaction.notes}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-500">
                          {transaction.category || "Uncategorized"}
                        </td>

                        <td
                          className={`whitespace-nowrap px-5 py-4 text-right font-medium ${
                            transaction.type === "income"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "−"}
                          {formatMoney(Number(transaction.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : !error && !loading ? (
        <p className="rounded-2xl border border-gray-200 p-8 text-sm text-gray-500">
          No report is available.
        </p>
      ) : null}
    </main>
  );
}

function SummaryCard({
  title,
  amount,
  tone,
}: {
  title: string;
  amount: number;
  tone: "green" | "red" | "neutral";
}) {
  const amountColor = {
    green: "text-emerald-600",
    red: "text-red-600",
    neutral: amount >= 0 ? "text-emerald-600" : "text-red-600",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 p-5 sm:p-6">
      <p className="text-sm text-gray-500">{title}</p>

      <p className={`mt-3 text-2xl font-semibold tracking-tight ${amountColor}`}>
        {formatMoney(amount)}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-gray-500">{label}</span>

      <span className={emphasize ? "font-semibold" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
