
"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, ArrowDownLeft, ArrowRight,
  ArrowUpRight, BriefcaseBusiness, CalendarDays, Check,
  CircleDollarSign, CreditCard, Download, Edit2,
  GraduationCap, LayoutDashboard, Menu,
  Plus, Search, ShieldCheck, ShoppingBag, Target,
  Trash2, TrendingDown, TrendingUp, Wallet, X, Utensils,
  HeartPulse, Car, House, Sparkles, ChartNoAxesCombined,
} from "lucide-react";

type TransactionType = "income" | "expense";
type Section = "Overview" | "Transactions" | "Budgets" | "Insights" | "Goals" | "Accounts";

type Transaction = {
  id: string;
  title: string;
  category: string;
  type: TransactionType;
  amount: number;
  date: string;
  notes?: string | null;
};

type ApiTransaction = Omit<Transaction, "date"> & {
  transaction_date: string;
};

type Budget = {
  id?: string;
  user_id?: string;
  category: string;
  amount: number;
};

type TransactionForm = {
  title: string;
  category: string;
  type: TransactionType;
  amount: string;
  date: string;
  notes: string;
};

const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Shopping", "Housing", "Bills",
  "Health", "Education", "Entertainment", "Travel", "Other",
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Investment", "Gift", "Other",
];

const NAV_ITEMS: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Transactions", icon: Activity },
  { label: "Budgets", icon: Target },
  { label: "Insights", icon: ChartNoAxesCombined },
  { label: "Goals", icon: GraduationCap },
  { label: "Accounts", icon: CreditCard },
];

const formatDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const createInitialForm = (date = ""): TransactionForm => ({
  title: "",
  category: "Food",
  type: "expense",
  amount: "",
  date,
  notes: "",
});

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function fromApi(row: ApiTransaction): Transaction {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    type: row.type,
    amount: Number(row.amount),
    date: row.transaction_date,
    notes: row.notes,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function DashboardPage() {
  const [section, setSection] = useState<Section>("Overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>(() => createInitialForm(""));
  const [budgetCategory, setBudgetCategory] = useState("Food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    const nextDate = new Date();
    setCurrentDate(nextDate);
    setForm((previous) => ({
      ...previous,
      date: previous.date || formatDateKey(nextDate),
    }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [transactionResponse, budgetResponse] = await Promise.all([
        fetch("/api/transactions", { cache: "no-store" }),
        fetch("/api/budgets", { cache: "no-store" }),
      ]);

      if (!transactionResponse.ok) throw new Error(await readError(transactionResponse));
      if (!budgetResponse.ok) throw new Error(await readError(budgetResponse));

      const transactionData = await transactionResponse.json();
      const budgetData = await budgetResponse.json();

      setTransactions(
        Array.isArray(transactionData.transactions)
          ? transactionData.transactions.map(fromApi)
          : [],
      );
      setBudgets(Array.isArray(budgetData.budgets) ? budgetData.budgets : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentMonthTransactions = useMemo(() => {
    if (!currentDate) return [];
    const month = formatDateKey(currentDate).slice(0, 7);
    return transactions.filter((transaction) => transaction.date.slice(0, 7) === month);
  }, [currentDate, transactions]);

  const totals = useMemo(() => {
    const income = currentMonthTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = currentMonthTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [currentMonthTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...transactions]
      .filter((item) =>
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search]);

  const spendingByCategory = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    currentMonthTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        totalsByCategory.set(
          item.category,
          (totalsByCategory.get(item.category) || 0) + item.amount,
        );
      });
    return [...totalsByCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions]);

  const openNewTransaction = () => {
    setEditing(null);
    setForm(createInitialForm(currentDate ? formatDateKey(currentDate) : ""));
    setError("");
    setModalOpen(true);
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditing(transaction);
    setForm({
      title: transaction.title,
      category: transaction.category,
      type: transaction.type,
      amount: String(transaction.amount),
      date: transaction.date.slice(0, 10),
      notes: transaction.notes || "",
    });
    setError("");
    setModalOpen(true);
  };

  const changeType = (type: TransactionType) => {
    setForm((previous) => ({
      ...previous,
      type,
      category: type === "income" ? "Salary" : "Food",
    }));
  };

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim()) {
      setError("Enter a transaction name.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      category: form.category,
      type: form.type,
      amount,
      transaction_date: form.date,
      notes: form.notes.trim() || null,
    };

    try {
      const response = await fetch("/api/transactions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      if (!response.ok) throw new Error(await readError(response));

      setModalOpen(false);
      setEditing(null);
      setForm(createInitialForm(currentDate ? formatDateKey(currentDate) : ""));
      setNotice(editing ? "Transaction updated." : "Transaction added.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(id: string) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice("Transaction deleted.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete transaction.");
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a budget greater than zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: budgetCategory, amount }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setBudgetAmount("");
      setNotice("Budget saved.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(category: string) {
    if (!window.confirm(`Delete the ${category} budget?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/budgets?category=${encodeURIComponent(category)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice("Budget deleted.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete budget.");
    }
  }

  function downloadTransactions() {
    const headers = ["Date", "Title", "Category", "Type", "Amount", "Notes"];
    const rows = filteredTransactions.map((item) => [
      item.date, item.title, item.category, item.type, String(item.amount), item.notes || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `luma-transactions-${formatDateKey(currentDate ?? new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const monthName = currentDate ? currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "This month";

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="dashboard-layout">
        <aside className={`sidebar ${mobileOpen ? "open" : ""}`} data-open={mobileOpen}>
          <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("Overview"); setMobileOpen(false); }}>
            <span className="brand-mark">l.</span>
            <span>
              <span className="brand-name">luma</span>
              <span className="brand-caption">Money, made clear</span>
            </span>
          </a>

          <div className="sidebar-label">Workspace</div>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${section === label ? "active" : ""}`}
                onClick={() => { setSection(label); setMobileOpen(false); }}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{label}</span>
                {label === "Transactions" && (
                  <span className="nav-count">{transactions.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-spacer" />

          <div className="goal-card">
            <div className="goal-card-top"><Sparkles size={16} /><span className="eyebrow">Your next step</span></div>
            <h3 className="goal-card-title">Build better habits.</h3>
            <p className="goal-card-description">Track your spending and make every rupee count.</p>
            <button className="goal-card-link" onClick={() => setSection("Insights")}>
              Explore insights <ArrowRight size={14} />
            </button>
          </div>

          <div className="profile">
            <div className="profile-avatar">L</div>
            <div className="profile-info">
              <div className="profile-name">Your workspace</div>
              <div className="profile-email">Personal finance</div>
            </div>
            <ShieldCheck size={16} className="profile-shield" />
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <button className="icon-button mobile-menu-button" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
                <Menu />
              </button>
              <div>
                <div className="topbar-title">Personal workspace</div>
                <div className="topbar-subtitle"><span className="status-dot" /> Your financial overview</div>
              </div>
            </div>
            <div className="topbar-right">
              <label className="search-box">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search transactions..."
                  aria-label="Search transactions"
                />
                {search && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch("")}><X size={13} /></button>}
              </label>
              <button className="icon-button" aria-label="Refresh data" onClick={() => void loadData()} title="Refresh">
                <Activity />
              </button>
            </div>
          </header>

          {(error || notice) && (
            <div className={`notice ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>
              {error ? <X size={17} /> : <Check size={17} />}
              <span>{error || notice}</span>
              {error && <button className="notice-dismiss" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button>}
            </div>
          )}

          {section === "Overview" && (
            <div className="dashboard-content">
              <section className="welcome-section">
                <div className="welcome-copy">
                  <div className="eyebrow">YOUR MONEY, IN FOCUS</div>
                  <h1 className="welcome-title">A clearer view of <em>your money.</em></h1>
                  <p className="welcome-description">Every rupee has a story. Understand yours, one transaction at a time.</p>
                </div>
                <div className="header-actions">
                  <span className="date-button"><CalendarDays size={15} /> {monthName}</span>
                  <button className="primary-button" onClick={openNewTransaction}><Plus size={16} /> Add transaction</button>
                </div>
              </section>

              <section className="metrics-grid" aria-label="Monthly summary">
                <Metric label="Net cash flow" value={money(totals.balance)} icon={Wallet} detail="Income minus expenses" tone={totals.balance >= 0 ? "green" : "red"} />
                <Metric label="Total income" value={money(totals.income)} icon={TrendingUp} detail={`${monthName}`} tone="green" />
                <Metric label="Total expenses" value={money(totals.expenses)} icon={TrendingDown} detail={`${monthName}`} tone="cyan" />
                <Metric label="Transactions" value={String(currentMonthTransactions.length)} icon={Activity} detail="This month" tone="neutral" />
              </section>

              <section className="dashboard-grid">
                <article className="balance-card">
                  <div className="balance-card-head">
                    <span className="balance-card-label">Monthly net cash flow</span>
                    <span className="balance-live"><span className="status-dot" /> LIVE DATA</span>
                  </div>
                  <div className="balance-amount">{money(totals.balance)}</div>
                  <div className="balance-meta">Based on recorded transactions for {monthName}.</div>
                  <div className="balance-bottom">
                    <div className="balance-stat"><span className="balance-stat-label">Money in</span><strong className="green-text">{money(totals.income)}</strong></div>
                    <div className="balance-stat"><span className="balance-stat-label">Money out</span><strong>{money(totals.expenses)}</strong></div>
                    <button className="secondary-button" onClick={() => setSection("Transactions")}>View activity <ArrowUpRight size={15} /></button>
                  </div>
                  <div className="hero-orbit hero-orbit-one" />
                  <div className="hero-orbit hero-orbit-two" />
                </article>

                <article className="panel spending-card">
                  <div className="panel-header">
                    <div><h2>Spending breakdown</h2><p>Where your money went this month</p></div>
                    <span className="panel-icon"><ChartNoAxesCombined size={17} /></span>
                  </div>
                  {spendingByCategory.length ? (
                    <>
                      <div className="spending-total">{money(totals.expenses)}</div>
                      <div className="category-list">
                        {spendingByCategory.slice(0, 5).map((item) => {
                          const percent = totals.expenses ? (item.amount / totals.expenses) * 100 : 0;
                          return (
                            <div className="category-row" key={item.category}>
                              <div className="category-row-top">
                                <span className="category-name"><CategoryIcon category={item.category} />{item.category}</span>
                                <span className="category-amount">{money(item.amount)}</span>
                              </div>
                              <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : <EmptyState title="No spending yet" description="Add an expense to see your spending breakdown." />}
                </article>
              </section>

              <section className="lower-grid">
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Recent transactions</h2><p>Your latest financial activity</p></div>
                    <button className="text-link" onClick={() => setSection("Transactions")}>View all <ArrowRight size={14} /></button>
                  </div>
                  {loading ? <Loading /> : transactions.length ? (
                    <div className="transaction-list">
                      {filteredTransactions.slice(0, 5).map((item) => (
                        <TransactionRow key={item.id} item={item} onEdit={openEditTransaction} onDelete={deleteTransaction} />
                      ))}
                    </div>
                  ) : <EmptyState title="A fresh start" description="Your transactions will appear here once you add one." action={<button className="secondary-button" onClick={openNewTransaction}><Plus size={14} /> Add your first transaction</button>} />}
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Budget pulse</h2><p>Spending against your limits</p></div>
                    <button className="text-link" onClick={() => setSection("Budgets")}>Manage <ArrowRight size={14} /></button>
                  </div>
                  {budgets.length ? (
                    <div className="budget-list">
                      {budgets.slice(0, 4).map((budget) => {
                        const spent = spendingByCategory.find((item) => item.category === budget.category)?.amount || 0;
                        const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                        return <BudgetRow key={budget.category} budget={budget} spent={spent} percent={percent} />;
                      })}
                    </div>
                  ) : <EmptyState title="Set your first budget" description="Give your spending a clear monthly limit." action={<button className="secondary-button" onClick={() => setSection("Budgets")}><Plus size={14} /> Create a budget</button>} />}
                </article>
              </section>
              <Footer />
            </div>
          )}

          {section === "Transactions" && (
            <div className="dashboard-content">
              <PageHeader eyebrow="YOUR ACTIVITY" title={<>Every transaction, <em>in view.</em></>} description="Review, search, export, and manage your recorded income and expenses." action={<button className="primary-button" onClick={openNewTransaction}><Plus size={16} /> Add transaction</button>} />
              <div className="toolbar panel">
                <div className="toolbar-copy"><span className="eyebrow">ALL RECORDS</span><strong>{filteredTransactions.length} transactions</strong></div>
                <button className="secondary-button" onClick={downloadTransactions}><Download size={15} /> Export CSV</button>
              </div>
              <article className="panel">
                {loading ? <Loading /> : filteredTransactions.length ? (
                  <div className="transaction-list">
                    {filteredTransactions.map((item) => <TransactionRow key={item.id} item={item} onEdit={openEditTransaction} onDelete={deleteTransaction} />)}
                  </div>
                ) : <EmptyState title={search ? "No matching transactions" : "Nothing recorded yet"} description={search ? "Try another search term." : "Add your first transaction to start tracking your money."} action={!search ? <button className="primary-button" onClick={openNewTransaction}><Plus size={15} /> Add transaction</button> : undefined} />}
              </article>
              <Footer />
            </div>
          )}

          {section === "Budgets" && (
            <div className="dashboard-content">
              <PageHeader eyebrow="SPEND WITH INTENTION" title={<>Give every rupee <em>a purpose.</em></>} description="Create monthly category limits and compare them with this month's recorded expenses." />
              <div className="budget-summary-grid">
                <Metric label="Monthly budget" value={money(budgets.reduce((sum, item) => sum + Number(item.amount), 0))} icon={Target} detail={`${budgets.length} categories`} tone="cyan" />
                <Metric label="Expenses this month" value={money(totals.expenses)} icon={TrendingDown} detail="Recorded spending" tone="neutral" />
                <Metric label="Remaining across budgets" value={money(budgets.reduce((sum, budget) => sum + Math.max(0, Number(budget.amount) - (spendingByCategory.find((item) => item.category === budget.category)?.amount || 0)), 0))} icon={Wallet} detail="Floored at zero per category" tone="green" />
              </div>
              <section className="overview-grid">
                <article className="panel">
                  <div className="panel-header"><div><h2>Your budgets</h2><p>Progress for the current month</p></div><Target size={18} /></div>
                  {budgets.length ? <div className="budget-list">
                    {budgets.map((budget) => {
                      const spent = spendingByCategory.find((item) => item.category === budget.category)?.amount || 0;
                      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                      return <div className="budget-row" key={budget.category}>
                        <BudgetRow budget={budget} spent={spent} percent={percent} />
                        <div className="budget-actions"><span>{percent >= 100 ? "Limit reached" : `${money(Math.max(0, budget.amount - spent))} remaining`}</span><button className="delete-button" aria-label={`Delete ${budget.category} budget`} onClick={() => void deleteBudget(budget.category)}><Trash2 size={15} /></button></div>
                      </div>;
                    })}
                  </div> : <EmptyState title="No budgets yet" description="Create a budget to set your spending limits." />}
                </article>
                <article className="panel">
                  <div className="panel-header"><div><h2>Create or update</h2><p>One budget per category</p></div><Plus size={18} /></div>
                  <form className="form-stack" onSubmit={saveBudget}>
                    <div className="form-field"><label htmlFor="budget-category">Category</label><select id="budget-category" className="select" value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)}>{EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
                    <div className="form-field"><label htmlFor="budget-amount">Monthly limit (₹)</label><input id="budget-amount" className="input" type="number" min="0.01" step="0.01" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="e.g. 5000" required /></div>
                    <p className="form-hint">Saving a category again updates its existing budget.</p>
                    <button className="primary-button full-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save budget"} <ArrowRight size={15} /></button>
                  </form>
                </article>
              </section>
              <Footer />
            </div>
          )}

          {section === "Insights" && (
            <div className="dashboard-content">
              <PageHeader eyebrow="UNDERSTAND YOUR HABITS" title={<>Small patterns. <em>Clearer decisions.</em></>} description="A snapshot based on the transactions you've recorded this month." />
              <section className="metrics-grid">
                <Metric label="Average daily spending" value={money(totals.expenses / Math.max(1, currentDate?.getDate() ?? 1))} icon={CalendarDays} detail="Calendar days elapsed" tone="cyan" />
                <Metric label="Largest category" value={spendingByCategory[0]?.category || "—"} icon={ChartNoAxesCombined} detail={spendingByCategory[0] ? money(spendingByCategory[0].amount) : "No expenses yet"} tone="neutral" />
                <Metric label="Income-to-expense ratio" value={totals.expenses ? `${(totals.income / totals.expenses).toFixed(2)}×` : "—"} icon={Activity} detail="This month's totals" tone="green" />
                <Metric label="Budget categories" value={String(budgets.length)} icon={Target} detail="Currently configured" tone="neutral" />
              </section>
              <section className="overview-grid">
                <article className="panel"><div className="panel-header"><div><h2>Category insights</h2><p>Expense share by category</p></div></div>
                  {spendingByCategory.length ? <div className="category-list">{spendingByCategory.map((item) => { const percent = totals.expenses ? item.amount / totals.expenses * 100 : 0; return <div className="category-row" key={item.category}><div className="category-row-top"><span className="category-name">{item.category}</span><span className="category-amount">{money(item.amount)} · {percent.toFixed(1)}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div></div>; })}</div> : <EmptyState title="Insights need data" description="Add a few expenses to reveal your spending patterns." />}</article>
                <article className="panel"><div className="panel-header"><div><h2>A simple observation</h2><p>Calculated from your current records</p></div><Sparkles size={18} /></div><div className="insight-callout"><span className="insight-callout-icon"><Activity size={18} /></span><h3>{totals.income === 0 && totals.expenses === 0 ? "Your story starts here." : totals.balance >= 0 ? "Your cash flow is positive." : "Spending is above income."}</h3><p>{totals.income === 0 && totals.expenses === 0 ? "Record income and expenses to build a useful picture of your money." : totals.balance >= 0 ? `You have recorded ${money(totals.balance)} more income than expenses this month.` : `Your recorded expenses exceed income by ${money(Math.abs(totals.balance))} this month. Review your categories and budgets.`}</p></div></article>
              </section>
              <Footer />
            </div>
          )}

          {section === "Goals" && (
            <div className="dashboard-content">
              <PageHeader eyebrow="LOOK AHEAD" title={<>Make room for <em>what matters.</em></>} description="Your savings-goal workspace is ready for the next feature. No goal progress is fabricated." />
              <article className="panel placeholder-panel"><div className="placeholder-icon"><GraduationCap size={25} /></div><h2>Savings goals are coming next.</h2><p>This section is currently a placeholder. Transaction tracking and budget management are connected to your existing API; savings goals are not yet stored or calculated.</p><button className="primary-button" onClick={() => setSection("Budgets")}>Manage budgets <ArrowRight size={15} /></button></article>
              <Footer />
            </div>
          )}

          {section === "Accounts" && (
            <div className="dashboard-content">
              <PageHeader eyebrow="YOUR FINANCIAL SPACE" title={<>Everything, <em>accounted for.</em></>} description="A home for your financial connections, with a clear distinction between available and planned features." />
              <article className="panel placeholder-panel"><div className="placeholder-icon"><CreditCard size={25} /></div><h2>Account connections are not enabled.</h2><p>Luma currently tracks transactions entered through the app. It does not connect to bank accounts or move money automatically.</p><div className="account-status"><span className="status-dot" /> Manual transaction tracking <span className="status-label">ACTIVE</span></div><div className="account-status"><span className="status-dot status-dot-muted" /> Bank integrations <span className="status-label">NOT CONNECTED</span></div></article>
              <Footer />
            </div>
          )}
        </main>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title">
            <div className="modal-header">
              <div><div className="eyebrow">{editing ? "EDIT RECORD" : "NEW RECORD"}</div><h2 id="transaction-modal-title">{editing ? "Edit transaction" : "Add a transaction"}</h2><p>Keep your financial picture up to date.</p></div>
              <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close dialog" disabled={saving}><X size={17} /></button>
            </div>
            <form className="form-stack" onSubmit={saveTransaction}>
              <div className="type-switch" aria-label="Transaction type">
                <button type="button" className={form.type === "expense" ? "active expense-tab" : ""} onClick={() => changeType("expense")}><ArrowUpRight size={14} /> Expense</button>
                <button type="button" className={form.type === "income" ? "active income-tab" : ""} onClick={() => changeType("income")}><ArrowDownLeft size={14} /> Income</button>
              </div>
              <div className="form-field"><label htmlFor="transaction-title">Name</label><input id="transaction-title" className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Weekly groceries" maxLength={120} required autoFocus /></div>
              <div className="form-row">
                <div className="form-field"><label htmlFor="transaction-amount">Amount (₹)</label><input id="transaction-amount" className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" required /></div>
                <div className="form-field"><label htmlFor="transaction-date">Date</label><input id="transaction-date" className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></div>
              </div>
              <div className="form-field"><label htmlFor="transaction-category">Category</label><select id="transaction-category" className="select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="form-field"><label htmlFor="transaction-notes">Notes <span className="optional-label">OPTIONAL</span></label><textarea id="transaction-notes" className="textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add a little context…" maxLength={1000} /></div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add transaction"} <ArrowRight size={15} /></button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, detail, tone }: {
  label: string; value: string; icon: typeof Wallet; detail: string;
  tone: "green" | "red" | "cyan" | "neutral";
}) {
  return <article className="metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><div className={`metric-value ${tone === "neutral" ? "" : `${tone}-text`}`}>{value}</div><div className="metric-footer">{detail}</div></article>;
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Food":
    case "Food & groceries":
      return <Utensils size={17} />;
    case "Transport":
      return <Car size={17} />;
    case "Shopping":
      return <ShoppingBag size={17} />;
    case "Housing":
      return <House size={17} />;
    case "Health":
      return <HeartPulse size={17} />;
    case "Business":
      return <BriefcaseBusiness size={17} />;
    case "Education":
      return <GraduationCap size={17} />;
    default:
      return <CircleDollarSign size={17} />;
  }
}

function TransactionRow({ item, onEdit, onDelete }: {
  item: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  return <div className="transaction-row">
    <div className={`transaction-icon ${item.type}`}><CategoryIcon category={item.category} /></div>
    <div className="transaction-info"><div className="transaction-title">{item.title}</div><div className="transaction-category">{item.category} <span className="transaction-separator">·</span> {formatDate(item.date)}</div></div>
    <div className={`transaction-amount ${item.type}`}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</div>
    <div className="transaction-actions"><button className="edit-button" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`} title="Edit"><Edit2 size={14} /></button><button className="delete-button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`} title="Delete"><Trash2 size={14} /></button></div>
  </div>;
}

function BudgetRow({ budget, spent, percent }: { budget: Budget; spent: number; percent: number }) {
  const capped = Math.min(percent, 100);
  return <div className="budget-row-inner">
    <div className="budget-row-top"><div><div className="budget-name">{budget.category}</div><div className="budget-caption">{money(spent)} spent of {money(Number(budget.amount))}</div></div><span className={`budget-percent ${percent >= 100 ? "over-budget" : ""}`}>{Math.round(percent)}%</span></div>
    <div className="progress-track"><div className={`progress-fill ${percent >= 100 ? "red-fill" : ""}`} style={{ width: `${capped}%` }} /></div>
  </div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon"><Wallet size={21} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

function Loading() {
  return <div className="loading-state"><span className="spinner" /> Loading your financial data…</div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: string; action?: React.ReactNode }) {
  return <section className="page-header"><div className="page-header-copy"><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div>{action && <div className="header-actions">{action}</div>}</section>;
}

function Footer() {
  return <footer className="dashboard-footer"><span>© Luma. Your money, your clarity.</span><span className="footer-security"><ShieldCheck size={13} /> Your data stays in your workspace.</span></footer>;
}
