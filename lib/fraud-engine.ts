import type {
  Account,
  Dataset,
  RiskAssessment,
  RiskFactor,
  RiskLevel,
  Transaction,
} from '@/types';

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const deviation = (values: number[]) => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - avg) ** 2)));
};

function hasPath(
  edges: Transaction[],
  from: string,
  to: string,
  maxDepth = 4,
): boolean {
  const seen = new Set([from]);
  let frontier = [from];
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const edge of edges) {
        if (edge.senderId === node && !seen.has(edge.recipientId)) {
          if (edge.recipientId === to) return true;
          seen.add(edge.recipientId);
          next.push(edge.recipientId);
        }
      }
    }
    frontier = next;
  }
  return false;
}

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function analyzeTransactions(
  dataset: Dataset,
): Map<string, RiskAssessment> {
  const ordered = [...dataset.transactions].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const assessments = new Map<string, RiskAssessment>();
  const history: Transaction[] = [];

  for (const tx of ordered) {
    const factors: RiskFactor[] = [];
    const time = Date.parse(tx.timestamp);
    const outgoing = history.filter((h) => h.senderId === tx.senderId);
    const amounts = outgoing.map((h) => h.amount);
    const avg = mean(amounts);
    const sd = deviation(amounts);
    const amountRatio = avg ? tx.amount / avg : 1;
    if (
      amounts.length >= 3 &&
      tx.amount > avg + Math.max(sd * 2.5, avg * 1.6)
    ) {
      const points = Math.min(
        28,
        Math.round(10 + Math.min(amountRatio, 5) * 4),
      );
      factors.push({
        name: 'Amount anomaly',
        score: points,
        explanation: `${tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} is ${amountRatio.toFixed(1)}× this sender’s prior average of ${avg.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`,
      });
    }
    const hour = history.filter(
      (h) =>
        h.senderId === tx.senderId &&
        time - Date.parse(h.timestamp) >= 0 &&
        time - Date.parse(h.timestamp) <= 3600000,
    );
    if (hour.length >= 2) {
      const points = Math.min(22, 8 + hour.length * 3);
      factors.push({
        name: 'Velocity anomaly',
        score: points,
        explanation: `${hour.length + 1} outgoing transactions occurred within one hour, including this transfer.`,
      });
    }
    const knownRecipient = outgoing.some(
      (h) => h.recipientId === tx.recipientId,
    );
    if (outgoing.length >= 3 && !knownRecipient)
      factors.push({
        name: 'New recipient',
        score: 10,
        explanation: `The recipient does not appear in the sender’s ${outgoing.length}-transaction history.`,
      });

    const recent7d = outgoing.filter(
      (h) => time - Date.parse(h.timestamp) <= 7 * 86400000,
    );
    const older = outgoing.filter(
      (h) => time - Date.parse(h.timestamp) > 7 * 86400000,
    );
    if (
      older.length >= 3 &&
      recent7d.length >= 3 &&
      mean(recent7d.map((h) => h.amount)) >
        mean(older.map((h) => h.amount)) * 2.2
    ) {
      factors.push({
        name: 'Activity change',
        score: 12,
        explanation:
          'Recent transaction value and frequency increased sharply relative to the account’s earlier history.',
      });
    }
    const incoming15m = history.filter(
      (h) =>
        h.recipientId === tx.senderId &&
        time - Date.parse(h.timestamp) >= 0 &&
        time - Date.parse(h.timestamp) <= 15 * 60000,
    );
    if (incoming15m.some((h) => tx.amount >= h.amount * 0.72))
      factors.push({
        name: 'Rapid fund movement',
        score: 22,
        explanation:
          'Funds were forwarded within 15 minutes of arriving, consistent with rapid pass-through behavior.',
      });
    if (hasPath(history, tx.recipientId, tx.senderId, 4))
      factors.push({
        name: 'Circular movement',
        score: 26,
        explanation:
          'This transfer closes a directed path that returns funds through connected accounts.',
      });

    const riskyNeighbors = history
      .filter(
        (h) =>
          h.senderId === tx.senderId ||
          h.recipientId === tx.senderId ||
          h.senderId === tx.recipientId ||
          h.recipientId === tx.recipientId,
      )
      .filter((h) => (assessments.get(h.id)?.score ?? 0) >= 50);
    if (riskyNeighbors.length >= 2)
      factors.push({
        name: 'Network risk',
        score: Math.min(18, 8 + riskyNeighbors.length * 2),
        explanation: `${riskyNeighbors.length} prior high-risk transfers touch the sender or recipient.`,
      });

    const score = Math.min(
      100,
      factors.reduce((sum, f) => sum + f.score, 0),
    );
    const level = riskLevel(score);
    assessments.set(tx.id, {
      transactionId: tx.id,
      score,
      level,
      factors,
      explanation: factors.length
        ? `${level} risk: ${factors.map((f) => f.name.toLowerCase()).join(', ')}.`
        : 'No material anomalies were detected from the available account history.',
    });
    history.push(tx);
  }
  return assessments;
}

export function suspiciousAccountIds(
  dataset: Dataset,
  assessments: Map<string, RiskAssessment>,
): Set<string> {
  const totals = new Map<string, number>();
  for (const tx of dataset.transactions) {
    const score = assessments.get(tx.id)?.score ?? 0;
    if (score >= 50) {
      totals.set(tx.senderId, (totals.get(tx.senderId) ?? 0) + 1);
      totals.set(tx.recipientId, (totals.get(tx.recipientId) ?? 0) + 1);
    }
  }
  return new Set(
    [...totals].filter(([, count]) => count >= 2).map(([id]) => id),
  );
}

export function accountHistory(account: Account, dataset: Dataset) {
  const related = dataset.transactions.filter(
    (t) => t.senderId === account.id || t.recipientId === account.id,
  );
  const outgoing = related.filter((t) => t.senderId === account.id);
  return {
    transactionCount: related.length,
    outgoingCount: outgoing.length,
    averageOutgoing: mean(outgoing.map((t) => t.amount)),
    uniqueCounterparties: new Set(
      related.map((t) =>
        t.senderId === account.id ? t.recipientId : t.senderId,
      ),
    ).size,
  };
}
