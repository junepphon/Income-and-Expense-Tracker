import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { getCategoryOption } from '../categories';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, BarChart2, Clock } from 'lucide-react';

interface FinanceChartsProps {
  transactions: Transaction[];
}

export default function FinanceCharts({ transactions }: FinanceChartsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');

  // 1. Process data for Monthly Comparison (Last 6 months)
  const monthlyData = useMemo(() => {
    const monthsGroup: { [key: string]: { month: string; rawMonth: string; income: number; expense: number } } = {};
    
    // Sort transactions by date asc to populate months chronologically
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    // Get Thai short month names
    const getThaiMonthLabel = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length < 2) return dateStr;
        const year = parseInt(parts[0]);
        const monthIndex = parseInt(parts[1]) - 1;
        const thaiMonths = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        // Convert to Buddhist Era year representation layout
        const shortYear = (year + 543).toString().substring(2);
        return `${thaiMonths[monthIndex]} ${shortYear}`;
      } catch (e) {
        return dateStr;
      }
    };

    sortedTxs.forEach((tx) => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!monthsGroup[monthKey]) {
        monthsGroup[monthKey] = {
          month: getThaiMonthLabel(tx.date),
          rawMonth: monthKey,
          income: 0,
          expense: 0,
        };
      }

      if (tx.type === 'income') {
        monthsGroup[monthKey].income += tx.amount;
      } else {
        monthsGroup[monthKey].expense += tx.amount;
      }
    });

    // Sort by key and take last 6 months
    return Object.values(monthsGroup)
      .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth))
      .slice(-6);
  }, [transactions]);

  // 2. Process data for Category Breakdown (current filter selection)
  const categoryBreakdownData = useMemo(() => {
    const categoryGroup: { [key: string]: { amount: number; type: 'income' | 'expense' } } = {};
    let totalTypeSum = 0;

    transactions.forEach((tx) => {
      if (activeTab !== 'all' && tx.type !== activeTab) return;
      if (!categoryGroup[tx.category]) {
        categoryGroup[tx.category] = { amount: 0, type: tx.type };
      }
      categoryGroup[tx.category].amount += tx.amount;
      totalTypeSum += tx.amount;
    });

    const items = Object.entries(categoryGroup).map(([category, info]) => {
      const option = getCategoryOption(category);
      
      // Determine elegant color matching
      let drawColor = '#a1a1aa';
      if (info.type === 'income') {
        if (category === 'Salary') drawColor = '#10b981';
        else if (category === 'Business') drawColor = '#14b8a6';
        else if (category === 'Investment') drawColor = '#06b6d4';
        else if (category === 'Rental') drawColor = '#6366f1';
        else drawColor = '#4f46e5';
      } else {
        if (category === 'Food') drawColor = '#f59e0b';
        else if (category === 'Utilities') drawColor = '#f97316';
        else if (category === 'Transport') drawColor = '#3b82f6';
        else if (category === 'Shopping') drawColor = '#ec4899';
        else if (category === 'Entertainment') drawColor = '#a855f7';
        else if (category === 'Health') drawColor = '#f43f5e';
        else if (category === 'Education') drawColor = '#8b5cf6';
        else if (category === 'Savings') drawColor = '#059669';
        else drawColor = '#64748b';
      }

      return {
        name: option.label,
        value: info.amount,
        type: info.type,
        percent: totalTypeSum > 0 ? (info.amount / totalTypeSum) * 100 : 0,
        color: drawColor,
        bgColorClass: option.color,
        icon: option.icon,
        rawCategory: category,
      };
    });

    // Sort by value largest to smallest
    return {
      items: items.sort((a, b) => b.value - a.value),
      total: totalTypeSum,
    };
  }, [transactions, activeTab]);

  // Formatter for Currency
  const formatTHB = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const currentSelectionTotalLabel = activeTab === 'all' ? 'รายรับ-รายจ่ายรวม' : activeTab === 'income' ? 'รายรับรวม' : 'รายจ่ายรวม';

  // Pie chart colors (Standard matches or custom theme fallback)
  const PIE_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="charts-bento-grid">
      
      {/* 1. Category Breakdown Chart and List (Now placed at the very top of statistics!) */}
      <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col min-h-[380px] shadow-sm hover:border-slate-200 transition-all duration-200" id="category-breakdown-box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 animate-fade-in" id="category-breakdown-header">
          <div>
            <h4 className="font-sans font-semibold text-slate-800 text-sm md:text-base flex items-center gap-1.5" id="breakdown-title">
              <PieIcon className="w-4 h-4 text-blue-600" id="breakdown-icon" />
              วิเคราะห์สัดส่วนรายหมวดหมู่
            </h4>
            <p className="text-xs text-slate-400 font-sans" id="breakdown-subtitle">สัดส่วนสถิติรายรับและรายจ่ายจากการทำรายการ</p>
          </div>
          
          {/* Toggle Type Category View with "All Combined" Default Option */}
          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50 self-start sm:self-center" id="category-tab-container">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-sans font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="cat-tab-all"
            >
              รวมทั้งหมด
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-3 py-1.5 text-xs font-sans font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-white text-rose-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="cat-tab-expense"
            >
              รายจ่าย
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-3 py-1.5 text-xs font-sans font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="cat-tab-income"
            >
              รายรับ
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden mt-2" id="analytics-content-container">
          
          {categoryBreakdownData.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-1 pb-8" id="breakdown-empty">
              <span>ยังไม่มีข้อมูล{currentSelectionTotalLabel} ในระบบ</span>
            </div>
          ) : (
            <>
              {/* Left Side: Semi-Ring/Pie visual representing combined types */}
              <div className="w-full md:w-2/5 flex flex-col items-center justify-center min-h-[150px] md:min-h-0" id="pie-chart-col">
                <div className="w-40 h-40 relative" id="pie-component-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdownData.items}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2.5}
                        dataKey="value"
                      >
                        {categoryBreakdownData.items.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center values representing combined stats summary */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-1" id="pie-center-summary">
                    <span className="text-[9px] font-sans text-slate-400 uppercase tracking-widest leading-none" id="pie-center-label">
                      {activeTab === 'all' ? 'ปริมาณรวม' : activeTab === 'income' ? 'รับรวม' : 'จ่ายรวม'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 mt-1 line-clamp-1" id="pie-center-amount">
                      {formatTHB(categoryBreakdownData.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Detailed visual list with Type badging and Progress bar indicators */}
              <div className="flex-1 overflow-y-auto max-h-[290px] md:max-h-none space-y-3.5 pr-1.5" id="breakdown-list-col">
                {categoryBreakdownData.items.map((item) => {
                  const barColor = item.bgColorClass || 'bg-slate-400';
                  
                  return (
                    <div key={item.rawCategory} className="space-y-1.5" id={`breakdown-row-${item.rawCategory}`}>
                      <div className="flex items-center justify-between text-xs" id={`row-labels-${item.rawCategory}`}>
                        <span className="font-sans font-medium text-slate-700 truncate max-w-[150px] sm:max-w-[200px] flex items-center gap-1.5" id={`row-title-${item.rawCategory}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${barColor}`} />
                          <span className="truncate">{item.name}</span>
                          {activeTab === 'all' && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 leading-none ${
                              item.type === 'income' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
                            }`}>
                              {item.type === 'income' ? 'รับ' : 'จ่าย'}
                            </span>
                          )}
                        </span>
                        <div className="font-mono flex items-center gap-1.5 text-slate-600" id={`row-metrics-${item.rawCategory}`}>
                          <span className="font-semibold" id={`row-amount-${item.rawCategory}`}>{formatTHB(item.value)}</span>
                          <span className="text-[10px] text-slate-400" id={`row-percent-${item.rawCategory}`}>({item.percent.toFixed(0)}%)</span>
                        </div>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" id={`row-track-${item.rawCategory}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-350 ${barColor}`} 
                          style={{ width: `${item.percent}%` }}
                          id={`row-fill-${item.rawCategory}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>

      {/* 2. Monthly Comparison Chart (Placed beautifully after the combined proportion chart) */}
      <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col h-[350px] shadow-sm hover:border-slate-200 transition-all duration-200" id="monthly-comparison-box">
        <div className="flex items-center justify-between mb-4" id="monthly-compare-header">
          <div>
            <h4 className="font-sans font-semibold text-slate-800 text-sm md:text-base flex items-center gap-1.5" id="monthly-compare-title">
              <BarChart2 className="w-4 h-4 text-blue-600" id="compare-icon" />
              เปรียบเทียบ รายรับ - รายจ่าย รายเดือน
            </h4>
            <p className="text-xs text-slate-400 font-sans" id="compare-subtitle">แสดงผลสรุปยอดและระดับเงินหมุนเวียนย้อนหลังสูงสุด 6 เดือน</p>
          </div>
        </div>

        <div className="flex-1 w-full text-xs font-mono" id="monthly-chart-canvas-container">
          {monthlyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1 pb-4" id="comparison-empty">
              <Clock className="w-8 h-8 shrink-0 animate-pulse text-slate-200" />
              <span>ยังไม่มีข้อมูลเปรียบเทียบรายเดือน</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  formatter={(value: any) => [`${formatTHB(Number(value))}`, '']} 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                <Bar dataKey="income" name="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
