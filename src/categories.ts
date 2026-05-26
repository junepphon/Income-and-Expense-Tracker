import { CategoryOption } from './types';

export const CATEGORY_OPTIONS: CategoryOption[] = [
  // Income categories
  { value: 'Salary', label: 'เงินเดือน / รายได้หลัก', icon: 'Briefcase', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  { value: 'Business', label: 'ธุรกิจ / ค้าขาย', icon: 'Store', color: 'bg-teal-500', textColor: 'text-teal-500' },
  { value: 'Investment', label: 'การเงิน / บทลงทุน / ปันผล', icon: 'TrendingUp', color: 'bg-cyan-500', textColor: 'text-cyan-500' },
  { value: 'Rental', label: 'รายรับจากค่าเช่าบ้าน', icon: 'Home', color: 'bg-indigo-500', textColor: 'text-indigo-500' },
  { value: 'OtherIncome', label: 'รายรับอื่น ๆ', icon: 'PlusCircle', color: 'bg-slate-500', textColor: 'text-slate-500' },

  // Expense categories
  { value: 'Food', label: 'อาหารและเครื่องดื่ม', icon: 'Utensils', color: 'bg-amber-500', textColor: 'text-amber-500' },
  { value: 'Utilities', label: 'ค่าน้ำ-ค่าไฟ-ค่าอินเทอร์เน็ต', icon: 'Lightbulb', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { value: 'Transport', label: 'การเดินทาง / เติมน้ำมัน', icon: 'Car', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { value: 'Shopping', label: 'ช้อปปิ้ง / ของใช้ส่วนตัว', icon: 'ShoppingBag', color: 'bg-pink-500', textColor: 'text-pink-500' },
  { value: 'Entertainment', label: 'ความบันเทิง / พักผ่อน', icon: 'Play', color: 'bg-purple-500', textColor: 'text-purple-500' },
  { value: 'Health', label: 'สุขภาพ / ยา / โรงพยาบาล', icon: 'HeartPulse', color: 'bg-rose-500', textColor: 'text-rose-500' },
  { value: 'Education', label: 'การศึกษา / หนังสือ', icon: 'GraduationCap', color: 'bg-violet-500', textColor: 'text-violet-500' },
  { value: 'Savings', label: 'เงินออม / เงินลงทุน', icon: 'PiggyBank', color: 'bg-emerald-600', textColor: 'text-emerald-600' },
  { value: 'OtherExpense', label: 'รายจ่ายอื่น ๆ', icon: 'MinusCircle', color: 'bg-zinc-500', textColor: 'text-zinc-500' }
];

export function getCategoryOption(value: string): CategoryOption {
  const found = CATEGORY_OPTIONS.find(opt => opt.value === value);
  if (found) return found;
  
  // Return generic fallback
  return {
    value,
    label: value,
    icon: 'HelpCircle',
    color: 'bg-zinc-500',
    textColor: 'text-zinc-500'
  };
}
