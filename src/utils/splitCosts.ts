export interface PaymentRecord {
  amount: number;
  date: string; // ISO or human date
  timestamp: number;
}

export interface TripExpenseForCalc {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  paid_by: string[]; // person names
  split_between: string[]; // person names
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CollaboratorForCalc {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface Settlement {
  from: string; // debtor name
  to: string; // creditor name
  amount: number;
  payments: PaymentRecord[];
}

export const calculatePersonBalance = (
  personName: string,
  expenses: TripExpenseForCalc[]
): number => {
  let totalPaid = 0;
  let totalOwed = 0;

  expenses.forEach((expense) => {
    // Cuánto pagó esta persona
    if (expense.paid_by.includes(personName)) {
      const numPayers = expense.paid_by.length || 1;
      totalPaid += expense.amount / numPayers;
    }

    // Cuánto debe esta persona
    if (expense.split_between.includes(personName)) {
      const numSplitters = expense.split_between.length || 1;
      totalOwed += expense.amount / numSplitters;
    }
  });

  return totalPaid - totalOwed;
};

export const calculateGlobalSettlements = (
  expenses: TripExpenseForCalc[],
  allParticipants: CollaboratorForCalc[]
): Settlement[] => {
  // 1) Calcular balances por persona
  const balances: Record<string, number> = {};
  allParticipants.forEach((p) => {
    balances[p.name] = calculatePersonBalance(p.name, expenses);
  });

  // 2) Separar en acreedores y deudores (ignorando tolerancias)
  type Entry = { name: string; balance: number };
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  Object.entries(balances).forEach(([name, balance]) => {
    if (balance > 0.01) creditors.push({ name, balance });
    else if (balance < -0.01) debtors.push({ name, balance: Math.abs(balance) });
  });

  // 3) Greedy matching
  const settlements: Settlement[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    const creditor = creditors[0];
    const debtor = debtors[0];

    const settlementAmount = Math.min(creditor.balance, debtor.balance);

    if (settlementAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: round2(settlementAmount),
        payments: [],
      });
    }

    creditor.balance -= settlementAmount;
    debtor.balance -= settlementAmount;

    if (creditor.balance <= 0.01) creditors.shift();
    if (debtor.balance <= 0.01) debtors.shift();
  }

  return settlements;
};

export const calculateSettlements = (
  personName: string,
  expenses: TripExpenseForCalc[],
  allParticipants: CollaboratorForCalc[]
): Settlement[] => {
  const global = calculateGlobalSettlements(expenses, allParticipants);
  return global.filter((s) => s.from === personName || s.to === personName);
};

/**
 * Calculate suggested settlements for a single expense only.
 * It works by computing each participant's net position within the expense (paid share - owed share),
 * then greedily matching debtors to creditors until all nets are ~0.
 */
export const calculatePerExpenseSettlements = (expense: TripExpenseForCalc): Settlement[] => {
  // Consider only participants involved in this expense
  const involvedNames = new Set<string>([...expense.paid_by, ...expense.split_between]);

  type Entry = { name: string; balance: number };
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  const numPayers = Math.max(1, expense.paid_by.length);
  const numSplitters = Math.max(1, expense.split_between.length);

  // Compute net for each involved person
  involvedNames.forEach((name) => {
    const paidShare = expense.paid_by.includes(name) ? expense.amount / numPayers : 0;
    const owedShare = expense.split_between.includes(name) ? expense.amount / numSplitters : 0;
    const net = paidShare - owedShare; // >0 creditor, <0 debtor
    if (net > 0.01) creditors.push({ name, balance: net });
    else if (net < -0.01) debtors.push({ name, balance: Math.abs(net) });
  });

  const settlements: Settlement[] = [];

  // Greedy matching for this expense only
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.balance, debtor.balance);
    if (amount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: round2(amount),
        payments: [],
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance <= 0.01) creditors.shift();
    if (debtor.balance <= 0.01) debtors.shift();
  }

  return settlements;
};

export const getAdjustedBalance = (
  personName: string,
  expenses: TripExpenseForCalc[],
  allParticipants: CollaboratorForCalc[],
  paymentHistory: Record<string, PaymentRecord[]>
): number => {
  let balance = calculatePersonBalance(personName, expenses);

  Object.entries(paymentHistory).forEach(([key, payments]) => {
    const [from, to] = key.split('→');
    payments.forEach((payment) => {
      if (from === personName) balance += payment.amount; // deudor pagó
      if (to === personName) balance -= payment.amount; // acreedor recibió
    });
  });

  return balance;
};

export const getPaymentsTotal = (payments: PaymentRecord[]): number =>
  payments.reduce((sum, p) => sum + p.amount, 0);

export const remainingForSettlement = (
  settlement: Settlement,
  paymentHistory: Record<string, PaymentRecord[]>
): number => {
  const key = `${settlement.from}→${settlement.to}`;
  const totalPaid = getPaymentsTotal(paymentHistory[key] || []);
  return Math.max(0, round2(settlement.amount - totalPaid));
};

export const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
