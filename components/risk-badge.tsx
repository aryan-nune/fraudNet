import type { RiskLevel } from '@/types';

const styles: Record<RiskLevel, string> = {
  LOW: 'border-[#35d7f2]/35 bg-[#35d7f2]/10 text-[#62e6f8]',
  MEDIUM: 'border-slate-500/50 bg-white/5 text-slate-200',
  HIGH: 'border-[#ff756e]/50 bg-[#ff5c55]/10 text-[#ff8d87]',
  CRITICAL: 'border-[#ff5c55]/70 bg-[#ff5c55]/20 text-[#ffaaa6]',
};
export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide ${styles[level]}`}
    >
      {level}
    </span>
  );
}
