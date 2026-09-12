'use client';

import { useMemo, useState } from 'react';
import { generateAttack, generateDataset } from '@/data/generate';
import { analyzeTransactions, suspiciousAccountIds } from '@/lib/fraud-engine';
import { detectNetworks } from '@/lib/network';
import type { AttackType, Dataset } from '@/types';

export function useFraudData() {
  const generated = useMemo(() => {
    try {
      return { dataset: generateDataset(), error: undefined };
    } catch {
      return {
        dataset: { accounts: [], transactions: [] } as Dataset,
        error:
          'Unable to generate synthetic dataset. Please reload the application.',
      };
    }
  }, []);
  const base = generated.dataset;
  const [attacks, setAttacks] = useState<Dataset['transactions']>([]);
  const [lastAttackIds, setLastAttackIds] = useState<string[]>([]);
  const [attackRun, setAttackRun] = useState(false);
  const dataset = useMemo(
    () => ({
      ...base,
      transactions: [...base.transactions, ...attacks].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      ),
    }),
    [base, attacks],
  );
  const assessments = useMemo(() => analyzeTransactions(dataset), [dataset]);
  const suspiciousAccounts = useMemo(
    () => suspiciousAccountIds(dataset, assessments),
    [dataset, assessments],
  );
  const stats = useMemo(() => {
    const risky = dataset.transactions.filter(
      (t) => (assessments.get(t.id)?.score ?? 0) >= 50,
    );
    return {
      totalTransactions: dataset.transactions.length,
      highRisk: dataset.transactions.filter(
        (t) => assessments.get(t.id)?.level === 'HIGH',
      ).length,
      criticalRisk: dataset.transactions.filter(
        (t) => assessments.get(t.id)?.level === 'CRITICAL',
      ).length,
      totalValue: dataset.transactions.reduce((s, t) => s + t.amount, 0),
      suspiciousValue: risky.reduce((s, t) => s + t.amount, 0),
      accounts: dataset.accounts.length,
      suspiciousAccounts: suspiciousAccounts.size,
      networks: detectNetworks(dataset, assessments),
    };
  }, [dataset, assessments, suspiciousAccounts]);
  const strongest = useMemo(
    () =>
      [...dataset.transactions].sort(
        (a, b) =>
          (assessments.get(b.id)?.score ?? 0) -
          (assessments.get(a.id)?.score ?? 0),
      )[0],
    [dataset, assessments],
  );

  const createAttack = (type: AttackType) => {
    const created = generateAttack(dataset, type, attacks.length + 1);
    setAttacks((current) => [...current, ...created]);
    setLastAttackIds(created.map((t) => t.id));
    setAttackRun(false);
  };
  return {
    dataset,
    assessments,
    suspiciousAccounts,
    stats,
    strongest,
    lastAttackIds,
    attackRun,
    setAttackRun,
    createAttack,
    error: generated.error,
  };
}
