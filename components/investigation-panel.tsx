'use client';

import { Activity, ArrowRight, Ban, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './risk-badge';
import { accountHistory } from '@/lib/fraud-engine';
import { formatTimestamp } from '@/lib/format';
import type { Dataset, NetworkTrace, RiskAssessment } from '@/types';

export function InvestigationPanel({
  dataset,
  assessments,
  transactionId,
  trace,
  onTrace,
  onSimulate,
}: {
  dataset: Dataset;
  assessments: Map<string, RiskAssessment>;
  transactionId: string;
  trace?: NetworkTrace;
  onTrace: () => void;
  onSimulate: () => void;
}) {
  const tx = dataset.transactions.find((t) => t.id === transactionId);
  if (!tx)
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
        Select a transaction to begin an investigation.
      </div>
    );
  const risk = assessments.get(tx.id)!;
  const sender = dataset.accounts.find((a) => a.id === tx.senderId)!;
  const recipient = dataset.accounts.find((a) => a.id === tx.recipientId)!;
  const history = accountHistory(sender, dataset);
  const related = dataset.transactions
    .filter(
      (t) =>
        t.id !== tx.id &&
        (t.senderId === sender.id ||
          t.recipientId === sender.id ||
          t.senderId === recipient.id ||
          t.recipientId === recipient.id),
    )
    .slice(-4);
  return (
    <section className="space-y-4" aria-label="Transaction investigation">
      <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-[#62e6f8]">{tx.id}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Investigation detail
            </h2>
          </div>
          <div className="text-right">
            <RiskBadge level={risk.level} />
            <p className="mt-1 text-3xl font-semibold text-white">
              {risk.score}
              <span className="text-sm text-slate-500">/100</span>
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{sender.name}</p>
            <p className="text-xs text-slate-500">
              {sender.id} · {sender.city}
            </p>
          </div>
          <ArrowRight className="shrink-0 text-[#35d7f2]" />
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate font-medium text-white">{recipient.name}</p>
            <p className="text-xs text-slate-500">
              {recipient.id} · {recipient.city}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-500">Amount</p>
            <p className="font-semibold text-white">
              {tx.amount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Timestamp</p>
            <p className="text-white">
              {formatTimestamp(tx.timestamp)}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Channel</p>
            <p className="text-white">{tx.channel}</p>
          </div>
          <div>
            <p className="text-slate-500">Sender history</p>
            <p className="text-white">
              {history.outgoingCount} sent · avg{' '}
              {history.averageOutgoing.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button
            onClick={onTrace}
            className="flex-1 bg-[#35d7f2] text-[#031018] hover:bg-[#66e7f8]"
          >
            <Network />
            Follow the money
          </Button>
          <Button
            onClick={onSimulate}
            disabled={!trace}
            variant="outline"
            className="flex-1 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Ban />
            Simulate intervention
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          <Activity size={17} className="text-[#ff6b63]" />
          Why was this flagged?
        </h3>
        <p className="mt-2 text-sm text-slate-400">{risk.explanation}</p>
        <div className="mt-4 space-y-3">
          {risk.factors.length ? (
            risk.factors.map((factor) => (
              <div
                key={factor.name}
                className="border-l-2 border-[#35d7f2]/50 pl-3"
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">
                    {factor.name}
                  </p>
                  <span className="text-xs font-semibold text-[#62e6f8]">
                    +{factor.score}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {factor.explanation}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No material risk factors detected.
            </p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="font-semibold text-white">Related transactions</h3>
        <div className="mt-3 space-y-2">
          {related.length ? (
            related.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-mono text-slate-400">{item.id}</span>
                <span className="text-slate-300">
                  {item.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
                <RiskBadge level={assessments.get(item.id)!.level} />
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No related transactions found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
