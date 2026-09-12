'use client';

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Dataset, NetworkTrace, RiskAssessment } from '@/types';

export function NetworkGraph({
  dataset,
  assessments,
  trace,
  selectedId,
}: {
  dataset: Dataset;
  assessments: Map<string, RiskAssessment>;
  trace?: NetworkTrace;
  selectedId?: string;
}) {
  const txs = trace
    ? dataset.transactions.filter((t) => trace.transactionIds.includes(t.id))
    : dataset.transactions
        .filter((t) => (assessments.get(t.id)?.score ?? 0) >= 50)
        .slice(-32);
  const accountIds = [
    ...new Set(txs.flatMap((t) => [t.senderId, t.recipientId])),
  ];
  const nodes: Node[] = accountIds.map((id, i) => {
    const account = dataset.accounts.find((a) => a.id === id)!;
    const suspicious = txs.some(
      (t) =>
        (t.senderId === id || t.recipientId === id) &&
        (assessments.get(t.id)?.score ?? 0) >= 50,
    );
    const angle = (i / Math.max(accountIds.length, 1)) * Math.PI * 2;
    const ring = 155 + (i % 3) * 75;
    return {
      id,
      position: {
        x: 420 + Math.cos(angle) * ring,
        y: 250 + Math.sin(angle) * ring,
      },
      data: { label: account.name },
      style: {
        color: '#e2e8f0',
        background: suspicious ? '#4c0519' : '#0f2537',
        border: `1px solid ${suspicious ? '#fb7185' : '#22d3ee'}`,
        borderRadius: 10,
        fontSize: 11,
        width: 122,
      },
    };
  });
  const edges: Edge[] = txs.map((t) => ({
    id: t.id,
    source: t.senderId,
    target: t.recipientId,
    animated: trace?.transactionIds.includes(t.id),
    label: t.amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }),
    style: {
      stroke:
        t.id === selectedId
          ? '#f59e0b'
          : (assessments.get(t.id)?.score ?? 0) >= 50
            ? '#fb7185'
            : '#38bdf8',
      strokeWidth: t.id === selectedId ? 3 : 1.5,
    },
    labelStyle: { fill: '#94a3b8', fontSize: 9 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  }));
  if (!txs.length)
    return (
      <div className="grid h-full place-items-center text-slate-400">
        No transactions available
      </div>
    );
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      minZoom={0.15}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e3a4f" gap={22} size={1} />
      <Controls className="!border-slate-700 !bg-slate-900 !text-white" />
      <MiniMap
        nodeColor={(n) => String(n.style?.background ?? '#0f2537')}
        maskColor="rgba(2, 8, 23, .72)"
      />
    </ReactFlow>
  );
}
