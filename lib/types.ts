export type Source = {
  id: string;
  name: string;
  balance: number;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  sourceId: string;
  createdAt: string;
};

export type AppState = {
  sources: Source[];
  expenses: Expense[];
};
