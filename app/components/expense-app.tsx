"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { AppState } from "@/lib/types";

export function ExpenseApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseSourceId, setExpenseSourceId] = useState("");

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as AppState;
      setState(data);
      if (data.sources.length > 0) {
        setExpenseSourceId((current) =>
          data.sources.some((s) => s.id === current)
            ? current
            : data.sources[0].id,
        );
      }
    } catch {
      setError("Could not load expenses. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const sourceBalances = useMemo(() => {
    if (!state) return new Map<string, number>();

    const spent = new Map<string, number>();
    for (const expense of state.expenses) {
      spent.set(expense.sourceId, (spent.get(expense.sourceId) ?? 0) + expense.amount);
    }

    const balances = new Map<string, number>();
    for (const source of state.sources) {
      balances.set(source.id, source.balance - (spent.get(source.id) ?? 0));
    }
    return balances;
  }, [state]);

  const totalRemaining = useMemo(() => {
    let total = 0;
    sourceBalances.forEach((balance) => {
      total += balance;
    });
    return total;
  }, [sourceBalances]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!state) return;

    const description = expenseDescription.trim();
    const amount = parseFloat(expenseAmount);
    const sourceId = expenseSourceId;
    if (!description || isNaN(amount) || amount <= 0 || !sourceId) return;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount, sourceId }),
      });
      if (!res.ok) throw new Error("Failed to add");
      await loadState();
      setExpenseDescription("");
      setExpenseAmount("");
    } catch {
      setError("Could not add expense. Please try again.");
    }
  }

  async function deleteExpense(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await loadState();
    } catch {
      setError("Could not delete expense. Please try again.");
    }
  }

  function getSourceName(sourceId: string): string {
    return state?.sources.find((s) => s.id === sourceId)?.name ?? "Unknown";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600">
        {error ?? "Something went wrong."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Tiny Expense
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track spending across your savings sources
          </p>
        </header>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-zinc-700">Total remaining</h2>
            <span className="text-xl font-semibold text-zinc-900">
              {formatCurrency(totalRemaining)}
            </span>
          </div>

          <div className="space-y-2">
            {state.sources.map((source) => {
              const remaining = sourceBalances.get(source.id) ?? source.balance;

              return (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{source.name}</p>
                    <p className="text-xs text-zinc-500">
                      Started at {formatCurrency(source.balance)}
                    </p>
                  </div>
                  <span
                    className={
                      remaining < 0
                        ? "font-medium text-red-600"
                        : "font-medium text-zinc-900"
                    }
                  >
                    {formatCurrency(remaining)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">Add expense</h2>
          <form onSubmit={addExpense} className="space-y-3">
            <input
              type="text"
              placeholder="Description"
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                placeholder="Amount"
                min="0.01"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-32"
              />
              <select
                value={expenseSourceId}
                onChange={(e) => setExpenseSourceId(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                {state.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Add
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-zinc-700">
            Expenses
            {state.expenses.length > 0 && (
              <span className="ml-2 font-normal text-zinc-400">
                ({state.expenses.length})
              </span>
            )}
          </h2>

          {state.expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {state.expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {expense.description}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {getSourceName(expense.sourceId)} ·{" "}
                      {new Date(expense.createdAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900">
                      −{formatCurrency(expense.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteExpense(expense.id)}
                      className="text-xs text-zinc-400 hover:text-red-600"
                      aria-label={`Delete ${expense.description}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
