import type { Dataset, NetworkTrace, RiskAssessment } from '@/types';
import { suspiciousAccountIds } from './fraud-engine';

export function traceTransaction(
  dataset: Dataset,
  assessments: Map<string, RiskAssessment>,
  transactionId: string,
  maxDepth = 4,
): NetworkTrace {
  const start = dataset.transactions.find((t) => t.id === transactionId);
  if (!start)
    throw new Error('The selected transaction is no longer available.');
  const txIds = new Set([start.id]);
  const accountIds = new Set([start.senderId, start.recipientId]);
  let frontier = [start.recipientId];
  const startTime = Date.parse(start.timestamp);
  let depthReached = 1;
  for (let depth = 1; depth < maxDepth; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      const edges = dataset.transactions.filter(
        (t) =>
          t.senderId === id &&
          Date.parse(t.timestamp) >= startTime &&
          Date.parse(t.timestamp) <= startTime + 72 * 3600000,
      );
      for (const edge of edges) {
        if (!txIds.has(edge.id)) {
          txIds.add(edge.id);
          accountIds.add(edge.recipientId);
          next.push(edge.recipientId);
          depthReached = depth + 1;
        }
      }
    }
    frontier = [...new Set(next)];
    if (!frontier.length) break;
  }
  const transactions = dataset.transactions.filter((t) => txIds.has(t.id));
  const suspicious = suspiciousAccountIds(dataset, assessments);
  const suspiciousTx = transactions.filter(
    (t) => (assessments.get(t.id)?.score ?? 0) >= 50,
  );
  return {
    accountIds: [...accountIds],
    transactionIds: [...txIds],
    totalValue: transactions.reduce((s, t) => s + t.amount, 0),
    suspiciousNodes: [...accountIds].filter((id) => suspicious.has(id)).length,
    suspiciousTransactions: suspiciousTx.length,
    pathLength: depthReached,
    networkRisk: transactions.length
      ? Math.round(
          transactions.reduce(
            (s, t) => s + (assessments.get(t.id)?.score ?? 0),
            0,
          ) / transactions.length,
        )
      : 0,
  };
}

export function detectNetworks(
  dataset: Dataset,
  assessments: Map<string, RiskAssessment>,
): number {
  const risky = dataset.transactions.filter(
    (t) => (assessments.get(t.id)?.score ?? 0) >= 50,
  );
  const remaining = new Set(risky.flatMap((t) => [t.senderId, t.recipientId]));
  let components = 0;
  while (remaining.size) {
    components++;
    const root = remaining.values().next().value as string;
    remaining.delete(root);
    const queue = [root];
    while (queue.length) {
      const node = queue.pop()!;
      for (const edge of risky) {
        if (edge.senderId === node || edge.recipientId === node) {
          const other =
            edge.senderId === node ? edge.recipientId : edge.senderId;
          if (remaining.delete(other)) queue.push(other);
        }
      }
    }
  }
  return components;
}

export function simulateIntervention(
  dataset: Dataset,
  assessments: Map<string, RiskAssessment>,
  trace: NetworkTrace,
  selectedAccount: string,
) {
  const affected = dataset.transactions.filter(
    (t) =>
      trace.transactionIds.includes(t.id) &&
      (t.senderId === selectedAccount || t.recipientId === selectedAccount),
  );
  const accounts = new Set(
    affected.flatMap((t) => [t.senderId, t.recipientId]),
  );
  const suspicious = affected.filter(
    (t) => (assessments.get(t.id)?.score ?? 0) >= 50,
  );
  return {
    transactionsAffected: affected.length,
    accountsAffected: accounts.size,
    transactionValueAffected: affected.reduce((s, t) => s + t.amount, 0),
    suspiciousPathsDisrupted: new Set(suspicious.map((t) => t.scenario ?? t.id))
      .size,
    estimatedFundsProtected: suspicious.reduce((s, t) => s + t.amount, 0),
  };
}
