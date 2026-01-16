type Transaction = {
  Date: string;
  Description: string;
  Amount: string;
  Category: string;
};

type RecurringGroup = {
  description: string;
  amount: number;
  frequency: string; // "monthly", "weekly", "yearly"
  transactions: Transaction[];
  nextCharge: string;
  monthlyAverage: number;
};

export function findRecurringTransactions(transactions: Transaction[]): RecurringGroup[] {
  if (transactions.length < 2) return [];

  // Group transactions by similar description and amount
  const groups: Map<string, Transaction[]> = new Map();

  transactions.forEach((t) => {
    const amount = parseFloat(t.Amount);
    if (amount >= 0) return; // Only expenses (negative amounts)

    const desc = t.Description.toLowerCase().trim();
    const absAmount = Math.abs(amount);
    
    // Create a key based on description (first 10 chars) and rounded amount
    const key = `${desc.substring(0, 15)}_${Math.round(absAmount)}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(t);
  });

  // Analyze each group for recurring patterns
  const recurring: RecurringGroup[] = [];

  groups.forEach((txns, key) => {
    if (txns.length < 2) return; // Need at least 2 occurrences

    // Sort by date
    const sorted = txns.sort((a, b) => 
      new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );

    // Calculate intervals between transactions (in days)
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const date1 = new Date(sorted[i - 1].Date);
      const date2 = new Date(sorted[i].Date);
      const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    if (intervals.length === 0) return;

    // Calculate average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Determine frequency and if it's recurring
    let frequency = "";
    let isRecurring = false;

    if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = "Monthly";
      isRecurring = true;
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      frequency = "Quarterly";
      isRecurring = true;
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      frequency = "Yearly";
      isRecurring = true;
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      frequency = "Weekly";
      isRecurring = true;
    }

    if (!isRecurring) return;

    // Calculate next charge date (estimate)
    const lastDate = new Date(sorted[sorted.length - 1].Date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

    // Calculate monthly average cost
    let monthlyAverage = Math.abs(parseFloat(sorted[0].Amount));
    if (frequency === "Weekly") monthlyAverage *= 4.33; // ~4.33 weeks per month
    if (frequency === "Quarterly") monthlyAverage /= 3;
    if (frequency === "Yearly") monthlyAverage /= 12;

    recurring.push({
      description: sorted[0].Description,
      amount: Math.abs(parseFloat(sorted[0].Amount)),
      frequency,
      transactions: sorted,
      nextCharge: nextDate.toISOString().split('T')[0],
      monthlyAverage,
    });
  });

  return recurring;
}