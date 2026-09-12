'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CircleDollarSign,
  Gauge,
  Network,
  ShieldAlert,
  Users,
  Waypoints,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AttackSimulator } from './attack-simulator';
import { InvestigationPanel } from './investigation-panel';
import { NetworkGraph } from './network-graph';
import { RiskBadge } from './risk-badge';
import { StatCard } from './stat-card';
import { useFraudData } from '@/hooks/use-fraud-data';
import { formatChartDate } from '@/lib/format';
import { simulateIntervention, traceTransaction } from '@/lib/network';
import type { NetworkTrace } from '@/types';

const money = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  });

export function FraudNetDashboard() {
  const {
    dataset,
    assessments,
    stats,
    strongest,
    lastAttackIds,
    attackRun,
    setAttackRun,
    createAttack,
    error,
  } = useFraudData();
  const [selectedId, setSelectedId] = useState(strongest?.id ?? '');
  const [trace, setTrace] = useState<NetworkTrace>();
  const [interventionOpen, setInterventionOpen] = useState(false);
  const selected =
    dataset.transactions.find((t) => t.id === selectedId) ?? strongest;
  const suspicious = useMemo(
    () =>
      dataset.transactions
        .filter((t) => (assessments.get(t.id)?.score ?? 0) >= 50)
        .sort(
          (a, b) =>
            (assessments.get(b.id)?.score ?? 0) -
            (assessments.get(a.id)?.score ?? 0),
        ),
    [dataset, assessments],
  );
  const chart = useMemo(() => {
    const buckets = new Map<
      string,
      { label: string; total: number; suspicious: number }
    >();
    for (const tx of dataset.transactions) {
      const date = new Date(tx.timestamp);
      const key = date.toISOString().slice(0, 10);
      const entry = buckets.get(key) ?? {
        label: formatChartDate(tx.timestamp),
        total: 0,
        suspicious: 0,
      };
      entry.total++;
      if ((assessments.get(tx.id)?.score ?? 0) >= 50) entry.suspicious++;
      buckets.set(key, entry);
    }
    return [...buckets.values()];
  }, [dataset, assessments]);
  const runTrace = () => {
    if (selected) setTrace(traceTransaction(dataset, assessments, selected.id));
  };
  const intervention =
    selected && trace
      ? simulateIntervention(dataset, assessments, trace, selected.recipientId)
      : undefined;

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || !strongest) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_strongest_investigation',
            title: 'Start strongest investigation',
            description:
              'Select the highest-risk transaction found by FraudNet and open its investigation state.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: () => {
              setSelectedId(strongest.id);
              setTrace(undefined);
              return {
                transactionId: strongest.id,
                score: assessments.get(strongest.id)?.score ?? 0,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {
      /* WebMCP is an optional progressive enhancement. */
    }
    return () => lifecycle.abort();
  }, [strongest, assessments]);

  if (error)
    return (
      <main className="grid min-h-screen place-items-center bg-[#050b14] p-6 text-slate-100">
        <div className="max-w-md rounded-xl border border-rose-800 bg-rose-950/30 p-6 text-center">
          <ShieldAlert className="mx-auto text-rose-300" />
          <h1 className="mt-3 text-xl font-semibold">
            FraudNet could not start
          </h1>
          <p className="mt-2 text-slate-300">{error}</p>
        </div>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#050b14] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#07101c]/90 px-4 py-3 backdrop-blur-xl lg:px-7">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-700/60 bg-cyan-400/10">
              <Waypoints size={20} className="text-cyan-300" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-white">
                FraudNet
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Follow the money. Find the network.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-800 bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              ● DEMO DATA
            </span>
            <Button
              size="sm"
              onClick={() => {
                if (strongest) {
                  setSelectedId(strongest.id);
                  setTrace(undefined);
                  document
                    .getElementById('investigation')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              Start investigation
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1680px] space-y-5 p-4 lg:p-7">
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
                Financial intelligence overview
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                Transaction risk command center
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic engine · seeded synthetic environment
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
            <StatCard
              label="Transactions"
              value={stats.totalTransactions.toLocaleString()}
              icon={Activity}
            />
            <StatCard
              label="High risk"
              value={stats.highRisk.toLocaleString()}
              icon={AlertTriangle}
              tone="amber"
            />
            <StatCard
              label="Critical"
              value={stats.criticalRisk.toLocaleString()}
              icon={ShieldAlert}
              tone="rose"
            />
            <StatCard
              label="Total value"
              value={money(stats.totalValue)}
              icon={CircleDollarSign}
            />
            <StatCard
              label="Suspicious value"
              value={money(stats.suspiciousValue)}
              icon={BadgeDollarSign}
              tone="rose"
            />
            <StatCard
              label="Accounts"
              value={stats.accounts.toLocaleString()}
              icon={Users}
            />
            <StatCard
              label="Suspicious accounts"
              value={stats.suspiciousAccounts.toLocaleString()}
              icon={Gauge}
              tone="amber"
            />
            <StatCard
              label="Networks"
              value={stats.networks.toLocaleString()}
              icon={Network}
              tone="rose"
            />
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,.75fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold text-white">
                  Transaction network
                </h2>
                <p className="text-xs text-slate-500">
                  Actual transfers with computed risk signals
                </p>
              </div>
              {trace && (
                <span className="rounded-full border border-cyan-800 bg-cyan-950/50 px-3 py-1 text-xs text-cyan-300">
                  Trace active · {trace.pathLength} hops
                </span>
              )}
            </div>
            <div className="h-[510px]">
              <NetworkGraph
                dataset={dataset}
                assessments={assessments}
                trace={trace}
                selectedId={selected?.id}
              />
            </div>
            {trace && (
              <div className="grid grid-cols-2 gap-px border-t border-slate-800 bg-slate-800 md:grid-cols-5">
                {[
                  ['Connected accounts', trace.accountIds.length],
                  ['Flow value', money(trace.totalValue)],
                  ['Suspicious nodes', trace.suspiciousNodes],
                  ['Suspicious transfers', trace.suspiciousTransactions],
                  ['Network risk', `${trace.networkRisk}/100`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-950/80 px-4 py-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="font-semibold text-white">Risk activity</h2>
            <p className="text-xs text-slate-500">
              Daily transactions from the generated ledger
            </p>
            <div className="mt-5 h-[210px] min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={210}
                initialDimension={{ width: 500, height: 210 }}
              >
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={28} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#22d3ee"
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="suspicious"
                    stroke="#fb7185"
                    fill="url(#riskFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex gap-5 text-xs text-slate-400">
              <span>
                <i className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400" />
                All activity
              </span>
              <span>
                <i className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-400" />
                Elevated risk
              </span>
            </div>
            <div className="mt-6 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Priority queue
                </h3>
                <span className="text-xs text-slate-500">
                  {suspicious.length} detected
                </span>
              </div>
              <div className="mt-3 max-h-[208px] space-y-2 overflow-y-auto pr-1">
                {suspicious.length ? (
                  suspicious.slice(0, 12).map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => {
                        setSelectedId(tx.id);
                        setTrace(undefined);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${selected?.id === tx.id ? 'border-cyan-700 bg-cyan-950/40' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}
                    >
                      <div>
                        <p className="font-mono text-xs text-slate-300">
                          {tx.id}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {money(tx.amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <RiskBadge level={assessments.get(tx.id)!.level} />
                        <p className="mt-1 text-xs text-slate-500">
                          Score {assessments.get(tx.id)!.score}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No transactions available
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section
          id="investigation"
          className="grid scroll-mt-20 gap-4 xl:grid-cols-[minmax(340px,.72fr)_minmax(0,1.28fr)]"
        >
          <InvestigationPanel
            dataset={dataset}
            assessments={assessments}
            transactionId={selected?.id ?? ''}
            trace={trace}
            onTrace={runTrace}
            onSimulate={() => setInterventionOpen(true)}
          />
          <AttackSimulator
            dataset={dataset}
            assessments={assessments}
            lastAttackIds={lastAttackIds}
            attackRun={attackRun}
            createAttack={createAttack}
            runAttack={() => setAttackRun(true)}
          />
        </section>
      </div>
      <Dialog open={interventionOpen} onOpenChange={setInterventionOpen}>
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Intervention impact</DialogTitle>
            <DialogDescription className="text-slate-400">
              Synthetic simulation — projected effects of blocking{' '}
              {selected?.recipientId} within the traced network. This does not
              claim funds were actually saved.
            </DialogDescription>
          </DialogHeader>
          {intervention && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Transactions affected', intervention.transactionsAffected],
                ['Accounts affected', intervention.accountsAffected],
                [
                  'Transaction value affected',
                  money(intervention.transactionValueAffected),
                ],
                [
                  'Suspicious paths disrupted',
                  intervention.suspiciousPathsDisrupted,
                ],
                [
                  'Estimated funds protected',
                  money(intervention.estimatedFundsProtected),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
