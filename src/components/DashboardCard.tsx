import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  amount: number;
  icon: ReactNode;
  colorClass: string; // e.g., "text-emerald-500 bg-emerald-50"
  trendText?: string;
  subtextColor?: string;
}

export default function DashboardCard({ title, amount, icon, colorClass, trendText, subtextColor }: DashboardCardProps) {
  const formatedAmount = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  // Detect card type for custom dynamic pastel styles
  const isBalance = title.includes('ยอดเงินคงเหลือ');
  const isIncome = title.includes('รายรับ');
  const isExpense = title.includes('รายจ่าย');

  let cardBg = "bg-white";
  let cardBorder = "border-slate-100 hover:border-slate-200";
  let titleColor = "text-zinc-500";
  let amountColor = "text-zinc-800";
  let iconContainerBg = colorClass;
  let computedSubtextColor = subtextColor || "text-zinc-400";

  if (isBalance) {
    if (amount >= 0) {
      cardBg = "bg-gradient-to-br from-blue-50/95 to-indigo-50/80";
      cardBorder = "border-blue-100/90 shadow-xs hover:border-blue-200 hover:shadow-blue-100/30";
      titleColor = "text-blue-700/90 font-bold";
      amountColor = "text-blue-950";
      iconContainerBg = "bg-white text-blue-600 shadow-xs";
      computedSubtextColor = "text-emerald-600 font-bold";
    } else {
      cardBg = "bg-gradient-to-br from-rose-50/95 to-amber-50/70";
      cardBorder = "border-rose-100/90 shadow-xs hover:border-rose-200 hover:shadow-rose-100/30";
      titleColor = "text-rose-700/90 font-bold";
      amountColor = "text-rose-950";
      iconContainerBg = "bg-white text-rose-600 shadow-xs";
      computedSubtextColor = "text-rose-600 font-bold";
    }
  } else if (isIncome) {
    cardBg = "bg-gradient-to-br from-emerald-50/95 to-teal-50/80";
    cardBorder = "border-emerald-100/90 shadow-xs hover:border-emerald-200 hover:shadow-emerald-100/30";
    titleColor = "text-emerald-700 font-bold";
    amountColor = "text-emerald-950";
    iconContainerBg = "bg-white text-emerald-600 shadow-xs";
    computedSubtextColor = "text-emerald-600 font-bold";
  } else if (isExpense) {
    cardBg = "bg-gradient-to-br from-rose-50/95 to-pink-50/80";
    cardBorder = "border-rose-100/90 shadow-xs hover:border-rose-200 hover:shadow-rose-100/30";
    titleColor = "text-rose-700 font-bold";
    amountColor = "text-rose-950";
    iconContainerBg = "bg-white text-rose-600 shadow-xs";
    computedSubtextColor = "text-rose-600 font-bold";
  }

  return (
    <div 
      className={`rounded-2xl border p-6 flex items-start gap-4 shadow-2xs hover:shadow-sm transition-all duration-300 ${cardBg} ${cardBorder}`}
      id={`dashboard-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div 
        className={`p-3 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/10 ${iconContainerBg}`} 
        id={`card-icon-container-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0" id={`card-text-container-${title.replace(/\s+/g, '-').toLowerCase()}`}>
        <p className={`text-[11px] font-sans uppercase tracking-wider ${titleColor}`} id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {title}
        </p>
        <p className={`text-2xl md:text-3xl font-mono font-extrabold mt-1 tracking-tight ${amountColor}`} id={`card-amount-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {formatedAmount}
        </p>
        {trendText && (
          <p className={`text-[11px] font-sans mt-1.5 flex items-center gap-1 ${computedSubtextColor}`} id={`card-trend-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            <span>{trendText}</span>
          </p>
        )}
      </div>
    </div>
  );
}
