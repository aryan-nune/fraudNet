'use client';

import { useState } from 'react';
import { Play, Radar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RiskBadge } from './risk-badge';
import type { AttackType, Dataset, RiskAssessment } from '@/types';

const attacks: AttackType[] = [
  'Money mule network',
  'Account takeover',
  'Rapid fund drain',
  'Layered transfers',
  'Circular transfer network',
];
export function AttackSimulator({
  dataset,
  assessments,
  lastAttackIds,
  attackRun,
  createAttack,
  runAttack,
}: {
  dataset: Dataset;
  assessments: Map<string, RiskAssessment>;
  lastAttackIds: string[];
  attackRun: boolean;
  createAttack: (type: AttackType) => void;
  runAttack: () => void;
}) {
  const [type, setType] = useState<AttackType>(attacks[0]);
  const created = dataset.transactions.filter((t) =>
    lastAttackIds.includes(t.id),
  );
  return (
    <section className="rounded-xl border border-violet-800/40 bg-gradient-to-br from-violet-950/35 to-slate-900/75 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-300">
            Attack laboratory
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Fraud attack simulator
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Inject deterministic transactions, then test the engine against
            them.
          </p>
        </div>
        <Radar className="text-violet-300" />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Select
          value={type}
          onValueChange={(value) => setType(value as AttackType)}
        >
          <SelectTrigger className="flex-1 border-slate-700 bg-slate-950 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {attacks.map((attack) => (
              <SelectItem key={attack} value={attack}>
                {attack}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => createAttack(type)}
          className="bg-violet-500 text-white hover:bg-violet-400"
        >
          <Sparkles />
          Generate fraud attack
        </Button>
        {created.length > 0 && (
          <Button
            onClick={runAttack}
            variant="outline"
            className="border-cyan-700 bg-transparent text-cyan-300 hover:bg-cyan-950 hover:text-cyan-200"
          >
            <Play />
            Run FraudNet
          </Button>
        )}
      </div>
      {created.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2">Transaction</th>
                <th className="pb-2">Route</th>
                <th className="pb-2">Amount</th>
                {attackRun && (
                  <>
                    <th className="pb-2">Score</th>
                    <th className="pb-2">Detection</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {created.map((tx) => {
                const risk = assessments.get(tx.id)!;
                return (
                  <tr key={tx.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-violet-300">{tx.id}</td>
                    <td className="py-2 text-slate-300">
                      {tx.senderId} → {tx.recipientId}
                    </td>
                    <td className="py-2 text-slate-300">
                      {tx.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </td>
                    {attackRun && (
                      <>
                        <td className="py-2 font-semibold text-white">
                          {risk.score}
                        </td>
                        <td className="py-2">
                          <RiskBadge level={risk.level} />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!attackRun && (
            <p className="mt-3 text-xs text-slate-500">
              Transactions created. Run FraudNet to reveal computed detections.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
