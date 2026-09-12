import { describe, expect, it } from 'vitest';
import { generateAttack, generateDataset } from '@/data/generate';
import { analyzeTransactions, suspiciousAccountIds } from './fraud-engine';
import { formatChartDate, formatTimestamp } from './format';
import {
  detectNetworks,
  simulateIntervention,
  traceTransaction,
} from './network';

describe('synthetic data', () => {
  it('is deterministic and meets the demo scale', () => {
    const a = generateDataset();
    const b = generateDataset();
    expect(a).toEqual(b);
    expect(a.accounts.length).toBeGreaterThanOrEqual(100);
    expect(a.transactions.length).toBeGreaterThanOrEqual(500);
  });
});

describe('server-safe formatting', () => {
  it('uses an explicit timezone for hydration-stable output', () => {
    expect(formatTimestamp('2026-06-07T23:27:00.000Z')).toBe(
      'Jun 7, 2026, 11:27 PM UTC',
    );
    expect(formatChartDate('2026-06-07T23:27:00.000Z')).toBe('Jun 7');
  });
});

describe('risk engine', () => {
  const dataset = generateDataset();
  const risks = analyzeTransactions(dataset);

  it('scores every transaction within the documented range', () => {
    expect(risks.size).toBe(dataset.transactions.length);
    expect(
      [...risks.values()].every((risk) => risk.score >= 0 && risk.score <= 100),
    ).toBe(true);
  });

  it('detects amount and velocity anomalies from history', () => {
    const namedFactors = [...risks.values()].flatMap((risk) =>
      risk.factors.map((factor) => factor.name),
    );
    expect(namedFactors).toContain('Amount anomaly');
    expect(namedFactors).toContain('Velocity anomaly');
  });

  it('detects suspicious accounts and connected networks', () => {
    expect(suspiciousAccountIds(dataset, risks).size).toBeGreaterThan(0);
    expect(detectNetworks(dataset, risks)).toBeGreaterThan(0);
  });

  it('traces real edges and computes intervention impact', () => {
    const selected = [...risks.values()].sort((a, b) => b.score - a.score)[0]!;
    const tx = dataset.transactions.find(
      (item) => item.id === selected.transactionId,
    )!;
    const trace = traceTransaction(dataset, risks, tx.id);
    expect(trace.transactionIds).toContain(tx.id);
    expect(trace.totalValue).toBeGreaterThanOrEqual(tx.amount);
    const impact = simulateIntervention(dataset, risks, trace, tx.recipientId);
    expect(impact.transactionsAffected).toBeGreaterThan(0);
    expect(impact.transactionValueAffected).toBeGreaterThan(0);
  });

  it('analyzes generated attacks rather than returning preset detections', () => {
    const attack = generateAttack(dataset, 'Circular transfer network', 2);
    const expanded = {
      ...dataset,
      transactions: [...dataset.transactions, ...attack],
    };
    const expandedRisks = analyzeTransactions(expanded);
    expect(attack.map((tx) => expandedRisks.get(tx.id)?.score)).toHaveLength(4);
    expect(
      attack.some((tx) => (expandedRisks.get(tx.id)?.score ?? 0) >= 50),
    ).toBe(true);
    expect(
      expandedRisks
        .get(attack.at(-1)!.id)
        ?.factors.some((factor) => factor.name === 'Circular movement'),
    ).toBe(true);
  });
});
