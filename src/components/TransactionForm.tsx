import React, { useState, useEffect } from 'react';
import { CATEGORY_OPTIONS } from '../categories';
import { Transaction } from '../types';
import CategoryIcon from './CategoryIcon';
import { Plus, Check, Clock, Edit2, Notebook, Calendar, Tag, DollarSign, RefreshCw } from 'lucide-react';

interface TransactionFormProps {
  onSave: (transactionData: Omit<Transaction, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
}

export default function TransactionForm({ onSave, editingTransaction, onCancelEdit }: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter category options based on type
  const isIncomeCat = (val: string) => ['Salary', 'Business', 'Investment', 'Rental', 'OtherIncome'].includes(val);
  const filteredCategories = CATEGORY_OPTIONS.filter(cat => 
    type === 'income' ? isIncomeCat(cat.value) : !isIncomeCat(cat.value)
  );

  // Sync state if editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description || '');
    } else {
      // Default reset
      setAmount('');
      setDescription('');
      // Set first appropriate category as default
      const defaultCats = CATEGORY_OPTIONS.filter(cat => 
        type === 'expense' ? !isIncomeCat(cat.value) : isIncomeCat(cat.value)
      );
      if (defaultCats.length > 0) {
        setCategory(defaultCats[0].value);
      }
    }
  }, [editingTransaction]);

  // Sync default category when switching type
  useEffect(() => {
    if (!editingTransaction) {
      const defaultCats = CATEGORY_OPTIONS.filter(cat => 
        type === 'expense' ? !isIncomeCat(cat.value) : isIncomeCat(cat.value)
      );
      if (defaultCats.length > 0) {
        setCategory(defaultCats[0].value);
      }
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('กรุณากรอกระบุจำนวนเงินที่มากกว่า 0');
      return;
    }

    if (!category) {
      setErrorMsg('กรุณาเลือกหมวดหมู่');
      return;
    }

    if (!date) {
      setErrorMsg('กรุณากรอกวันที่นำเข้าข้อมูล');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        amount: numAmount,
        type,
        category,
        date,
        description,
      });
      
      // Reset form if not editing
      if (!editingTransaction) {
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm" id="transaction-form-card">
      <div className="flex items-center justify-between mb-5" id="form-header-container">
        <h3 className="font-sans font-semibold text-lg text-slate-800 flex items-center gap-2" id="form-title">
          {editingTransaction ? (
            <>
              <Edit2 className="w-5 h-5 text-blue-600" id="title-icon-edit" />
              แก้ไขรายการบันทึก
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 text-emerald-500" id="title-icon-add" />
              บันทึกรายการใหม่
            </>
          )}
        </h3>
        {editingTransaction && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            id="cancel-edit-btn"
          >
            ยกเลิกแก้ไข
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 mb-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-sans tracking-wide" id="form-error-banner">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="transaction-form">
        {/* Toggle Type */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl" id="type-toggle-container">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 px-3 text-sm font-sans font-medium rounded-lg text-center transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-white text-rose-600 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="toggle-expense-btn"
          >
            รายจ่าย (Expense)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 px-3 text-sm font-sans font-medium rounded-lg text-center transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-white text-emerald-600 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            id="toggle-income-btn"
          >
            รายรับ (Income)
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1" id="amount-label">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" id="label-icon-amount" /> จำนวนเงิน (บาท)
          </label>
          <div className="relative" id="amount-input-group">
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-lg font-mono font-semibold text-slate-800 pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all"
              id="amount-input"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-sm font-medium text-slate-400" id="currency-unit">
              THB
            </span>
          </div>
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1" id="date-label">
            <Calendar className="w-3.5 h-3.5 text-slate-400" id="label-icon-date" /> วันที่ทำรายการ
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full font-sans text-sm text-slate-800 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all"
            id="date-input"
          />
        </div>

        {/* Dynamic Theme Category Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1" id="category-label">
            <Tag className="w-3.5 h-3.5 text-slate-400" id="label-icon-category" /> เลือกหมวดหมู่
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50" id="categories-grid">
            {filteredCategories.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                    isSelected
                      ? `${cat.color} text-white border-transparent shadow-xs scale-[0.98]`
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                  id={`cat-select-${cat.value}`}
                >
                  <CategoryIcon name={cat.icon} className="w-5 h-5 mb-1" id={`icon-${cat.value}`} />
                  <span className="text-[11px] font-sans font-medium line-clamp-1" id={`label-${cat.value}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Note */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1" id="desc-label">
            <Notebook className="w-3.5 h-3.5 text-slate-400" id="label-icon-desc" /> บันทึกข้อความ (ย่อ)
          </label>
          <input
            type="text"
            placeholder="เช่น ค่าข้าวกลางวัน ค่าวินมอเตอร์ไซค์ ฯลฯ"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={180}
            className="w-full font-sans text-sm text-slate-800 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all"
            id="desc-input"
          />
        </div>

        {/* Submit action */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl text-center text-sm font-sans font-semibold text-white transition-all duration-200 shadow-md ${
            isSubmitting
              ? 'bg-zinc-400 cursor-not-allowed'
              : type === 'income'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 cursor-pointer'
              : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10 cursor-pointer'
          }`}
          id="submit-transaction-btn"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" id="submit-loader" />
              กำลังประมวลผล...
            </>
          ) : editingTransaction ? (
            <>
              <Check className="w-4 h-4" id="submit-icon-edit" />
              ยืนยันการแก้ไขข้อมูล
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" id="submit-icon-add" />
              บันทึกรายการ {type === 'income' ? 'รายรับ' : 'รายจ่าย'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
