import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  amount: number;
  icon: ReactNode;
  colorClass: string; // e.g., "text-emerald-500 bg-emerald-50"
  trendText?: string;
  subtextColor?: string;
}

export default function DashboardCard({ title, amount, icon, colorClass, trendText, subtextColor = 'text-zinc-500' }: DashboardCardProps) {
  const formatedAmount = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-start gap-4 shadow-sm hover:border-slate-200 hover:shadow-md transition-all duration-200" id={`dashboard-card-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className={`p-4 rounded-xl flex items-center justify-center ${colorClass}`} id={`card-icon-container-${title.replace(/\s+/g, '-').toLowerCase()}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0" id={`card-text-container-${title.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wider" id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {title}
        </p>
        <p className="text-xl md:text-2xl font-mono font-bold text-zinc-800 mt-1 truncate" id={`card-amount-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {formatedAmount}
        </p>
        {trendText && (
          <p className={`text-[11px] font-sans mt-1 ${subtextColor}`} id={`card-trend-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            {trendText}
          </p>
        )}
      </div>
    </div>
  );
}
