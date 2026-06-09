import { randomUUID } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { useDatabase } from "./env";
import getMongoClient, { DB_NAME } from "./mongodb";
import type { AppState, Expense, Source } from "./types";

const EXAMPLE_PATH = path.join(process.cwd(), "data", "example.json");
const SOURCES_COLLECTION = "sources";
const EXPENSES_COLLECTION = "expenses";

async function readExampleFile(): Promise<AppState> {
  const raw = await readFile(EXAMPLE_PATH, "utf-8");
  return JSON.parse(raw) as AppState;
}

async function writeExampleFile(state: AppState): Promise<void> {
  await writeFile(EXAMPLE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

async function getSourcesFromDb(): Promise<Source[]> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection<Source>(SOURCES_COLLECTION);
  return collection.find().sort({ name: 1 }).toArray();
}

async function getExpensesFromDb(): Promise<Expense[]> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection<Expense>(EXPENSES_COLLECTION);
  return collection.find().sort({ createdAt: -1 }).toArray();
}

async function getStateFromDb(): Promise<AppState> {
  const [sources, expenses] = await Promise.all([
    getSourcesFromDb(),
    getExpensesFromDb(),
  ]);
  return { sources, expenses };
}

async function addExpenseToDb(expense: Expense): Promise<void> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection<Expense>(EXPENSES_COLLECTION);
  await collection.insertOne(expense);
}

async function deleteExpenseFromDb(id: string): Promise<void> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection<Expense>(EXPENSES_COLLECTION);
  await collection.deleteOne({ id });
}

function isValidSource(source: unknown): source is Source {
  if (!source || typeof source !== "object") return false;
  const s = source as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    s.id.length > 0 &&
    typeof s.name === "string" &&
    s.name.length > 0 &&
    typeof s.balance === "number" &&
    Number.isFinite(s.balance)
  );
}

export async function upsertSources(sources: Source[]): Promise<Source[]> {
  const client = await getMongoClient();
  const collection = client.db(DB_NAME).collection<Source>(SOURCES_COLLECTION);

  for (const source of sources) {
    await collection.updateOne({ id: source.id }, { $set: source }, { upsert: true });
  }

  return collection.find().sort({ name: 1 }).toArray();
}

export function parseSources(body: unknown): Source[] | null {
  if (!body || typeof body !== "object") return null;
  const sources = (body as { sources?: unknown }).sources;
  if (!Array.isArray(sources) || sources.length === 0) return null;
  if (!sources.every(isValidSource)) return null;
  return sources;
}

export async function getState(): Promise<AppState> {
  if (useDatabase()) {
    return getStateFromDb();
  }
  return readExampleFile();
}

export async function addExpense(
  expense: Omit<Expense, "id" | "createdAt">,
): Promise<Expense> {
  const state = await getState();
  const sourceExists = state.sources.some((s) => s.id === expense.sourceId);
  if (!sourceExists) {
    throw new Error("Invalid source");
  }

  const newExpense: Expense = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...expense,
  };

  if (useDatabase()) {
    await addExpenseToDb(newExpense);
  } else {
    await writeExampleFile({
      ...state,
      expenses: [newExpense, ...state.expenses],
    });
  }

  return newExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  if (useDatabase()) {
    await deleteExpenseFromDb(id);
    return;
  }

  const state = await getState();
  await writeExampleFile({
    ...state,
    expenses: state.expenses.filter((e) => e.id !== id),
  });
}
