import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { CATEGORY_OPTIONS, getCategoryOption } from '../categories';
import CategoryIcon from './CategoryIcon';
import { Search, Filter, Trash2, Edit2, FileText, ArrowUpDown, Calendar, HelpCircle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  onEditSelect: (transaction: Transaction) => void;
  isLoading: boolean;
}

export default function TransactionList({ transactions, onDelete, onEditSelect, isLoading }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Formatter for Currency
  const formatTHB = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Convert Gregorian system date to beautiful local string
  const formatThaiDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      
      const day = date.getDate();
      const month = thaiMonths[date.getMonth()];
      const year = date.getFullYear() + 543; // Buddhist Era calendar
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Filter and Sort Pipeline
  const filteredTxs = useMemo(() => {
    let result = [...transactions];

    // 1. Term query search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        tx =>
          tx.description.toLowerCase().includes(term) ||
          getCategoryOption(tx.category).label.toLowerCase().includes(term)
      );
    }

    // 2. Type Filter
    if (typeFilter !== 'all') {
      result = result.filter(tx => tx.type === typeFilter);
    }

    // 3. Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(tx => tx.category === categoryFilter);
    }

    // 4. Multi Sort Check
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
        case 'date-asc':
          return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return b.date.localeCompare(a.date);
      }
    });

    return result;
  }, [transactions, searchTerm, typeFilter, categoryFilter, sortBy]);

  // Pagination Engine
  const paginatedTxs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTxs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTxs, currentPage]);

  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);

  // Handle filter changes (Reset to page 1)
  const handleTypeChange = (type: 'all' | 'income' | 'expense') => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden" id="ledger-history-container">
      
      {/* Search & Filter Header Section */}
      <div className="p-6 border-b border-slate-100 space-y-4" id="filters-header-group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="ledger-top-row">
          <h3 className="font-sans font-semibold text-slate-800 text-base flex items-center gap-2" id="ledger-headline">
            <FileText className="w-5 h-5 text-blue-600" />
            ประวัติการทำรายการ ({filteredTxs.length} รายการ)
          </h3>
          
          {/* Quick Search */}
          <div className="relative w-full md:w-72" id="search-input-box">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารายละเอียด หรือ หมวดหมู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-sans pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all text-slate-700"
              id="ledger-search-box"
            />
          </div>
        </div>

        {/* Filters Multi Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans" id="filters-menu-grid">
          {/* Type dropdown toggle */}
          <div className="flex flex-col gap-1" id="filter-col-type">
            <label className="text-slate-400 font-medium">ประเภทธุรกรรม</label>
            <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50 h-10 items-center">
              <button
                onClick={() => handleTypeChange('all')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium cursor-pointer transition-all ${
                  typeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/40' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => handleTypeChange('income')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium cursor-pointer transition-all ${
                  typeFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/40' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                รายรับ
              </button>
              <button
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium cursor-pointer transition-all ${
                  typeFilter === 'expense' ? 'bg-white text-rose-500 shadow-sm ring-1 ring-slate-200/40' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                รายจ่าย
              </button>
            </div>
          </div>

          {/* Category Dropdown selective */}
          <div className="flex flex-col gap-1" id="filter-col-category">
            <label className="text-slate-400 font-medium">แยกหมวดหมู่</label>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 bg-slate-50 border border-slate-200 rounded-xl h-10 hover:border-slate-300 focus:outline-hidden focus:border-blue-600 transition-all font-medium text-slate-700 cursor-pointer"
              id="category-dropdown-filter"
            >
              <option value="all">ทั้งหมดทุกหมวดหมู่</option>
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Sort selection dropdown */}
          <div className="flex flex-col gap-1" id="filter-col-sorting">
            <label className="text-slate-400 font-medium">จัดเรียงตาม</label>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 bg-slate-50 border border-slate-200 rounded-xl h-10 hover:border-slate-300 focus:outline-hidden focus:border-blue-600 transition-all font-medium text-slate-700 cursor-pointer"
              id="sort-dropdown-filter"
            >
              <option value="date-desc">เรียงตาม: วันที่ล่าสุด (ใหม่-เก่า)</option>
              <option value="date-asc">เรียงตาม: วันแรกสุด (เก่า-ใหม่)</option>
              <option value="amount-desc">เรียงตาม: จำนวนเงินล่าสุด (มาก-น้อย)</option>
              <option value="amount-asc">เรียงตาม: จำนวนเงินล่าสุด (น้อย-มาก)</option>
            </select>
          </div>

          {/* Visual Indicator of count total search */}
          <div className="flex items-end" id="filter-col-info">
            <div className="w-full bg-blue-50 border border-blue-100/50 rounded-xl h-10 flex items-center justify-center text-center p-2 text-[10px] text-blue-700 font-medium">
              พบ {filteredTxs.length} จาก {transactions.length} ข้อมูลทั้งหมด
            </div>
          </div>
        </div>
      </div>

      {/* Grid or Table Listing */}
      <div className="overflow-x-auto flex-1" id="transaction-table-wrapper">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2" id="ledger-loading-state">
            <ArrowUpDown className="w-8 h-8 text-slate-200 animate-spin" />
            <span className="text-xs font-sans">กำลังดึงฐานข้อมูล...</span>
          </div>
        ) : paginatedTxs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2" id="ledger-empty-state">
            <HelpCircle className="w-10 h-10 text-slate-200" />
            <span className="text-sm font-sans font-medium">ไม่มีรายการบันทึกที่เข้าเกณฑ์เงื่อนไข</span>
            <span className="text-xs text-slate-300">กรุณากรอกรายการใหม่ด้านบน หรือรีเซ็ตตัวกรอง</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="ledger-table-grid">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-sans font-semibold tracking-wider" id="table-headers-row">
                <th className="py-4.5 px-6">วันที่</th>
                <th className="py-4.5 px-4">หมวดหมู่</th>
                <th className="py-4.5 px-4 hidden sm:table-cell">รายละเอียด/คำโน้ต</th>
                <th className="py-4.5 px-4 text-right">จำนวนเงิน (บาท)</th>
                <th className="py-4.5 px-6 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs" id="table-body-container">
              {paginatedTxs.map((tx) => {
                const categoryOption = getCategoryOption(tx.category);
                const isExpense = tx.type === 'expense';
                
                return (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-slate-50/30 transition-colors group" 
                    id={`tx-row-${tx.id}`}
                  >
                    {/* Date stamp representation */}
                    <td className="py-4 px-6 whitespace-nowrap text-slate-500 font-medium" id={`tx-cell-date-${tx.id}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>{formatThaiDate(tx.date)}</span>
                      </div>
                    </td>

                    {/* Category Label badge */}
                    <td className="py-4 px-4 whitespace-nowrap" id={`tx-cell-category-${tx.id}`}>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border border-slate-100 bg-slate-50" id={`tx-badge-${tx.id}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${categoryOption.color}`} />
                        <CategoryIcon name={categoryOption.icon} className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-700">{categoryOption.label}</span>
                      </div>
                    </td>

                    {/* Description memo notes */}
                    <td className="py-4 px-4 text-slate-500 max-w-[200px] truncate hidden sm:table-cell" id={`tx-cell-desc-${tx.id}`}>
                      {tx.description || <span className="text-slate-300 italic">ไม่มีบันทึกย่อ</span>}
                    </td>

                    {/* Numeric Value Amount, Color matching income/expense */}
                    <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-sm" id={`tx-cell-amount-${tx.id}`}>
                      <span className={isExpense ? 'text-rose-500' : 'text-emerald-600'}>
                        {isExpense ? '-' : '+'}
                        {formatTHB(tx.amount).replace('฿', '')}
                      </span>
                    </td>

                    {/* Row control actions buttons */}
                    <td className="py-4 px-6 text-center whitespace-nowrap" id={`tx-cell-actions-${tx.id}`}>
                      <div className="flex items-center justify-center gap-1" id={`actions-btn-group-${tx.id}`}>
                        <button
                          onClick={() => onEditSelect(tx)}
                          title="แก้ไขรายการ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          id={`tx-edit-btn-${tx.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ดำเนินการแล้วไม่สามารถกู้คืนได้')) {
                              onDelete(tx.id);
                            }
                          }}
                          title="ลบรายการ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          id={`tx-delete-btn-${tx.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bottom Footer layout */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-sans text-slate-500" id="ledger-pagination-panel">
          <span id="pagination-indicator">หน้า {currentPage} จากทั้งหมด {totalPages}</span>
          <div className="flex items-center gap-1" id="pagination-btn-group">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-slate-50 font-medium transition-colors cursor-pointer"
              id="prev-page-btn"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:hover:bg-slate-50 font-medium transition-colors cursor-pointer"
              id="next-page-btn"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
