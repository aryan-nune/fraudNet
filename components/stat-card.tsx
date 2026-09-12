import type { LucideIcon } from 'lucide-react';
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'cyan' | 'rose' | 'amber';
}) {
  const colors = {
    cyan: 'text-cyan-300 bg-cyan-400/10',
    rose: 'text-rose-300 bg-rose-400/10',
    amber: 'text-amber-300 bg-amber-400/10',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 shadow-[0_16px_40px_rgba(0,0,0,.18)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className={`rounded-lg p-2 ${colors[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}
