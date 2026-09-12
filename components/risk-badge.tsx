import type { RiskLevel } from '@/types';

const styles: Record<RiskLevel, string> = {
  LOW: 'border-cyan-800/60 bg-cyan-950/40 text-cyan-300',
  MEDIUM: 'border-amber-800/60 bg-amber-950/40 text-amber-300',
  HIGH: 'border-orange-700/60 bg-orange-950/40 text-orange-300',
  CRITICAL: 'border-rose-700/60 bg-rose-950/50 text-rose-300',
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
