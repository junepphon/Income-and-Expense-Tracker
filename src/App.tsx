import { useState, useEffect, useMemo } from 'react';
import { api, isFirebaseConfigured, auth, getBypassFirebase, setBypassFirebase } from './firebase';
import { Transaction } from './types';
import DashboardCard from './components/DashboardCard';
import TransactionForm from './components/TransactionForm';
import FinanceCharts from './components/FinanceCharts';
import TransactionList from './components/TransactionList';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  LogOut, 
  Database, 
  CloudOff, 
  User, 
  PiggyBank, 
  Sparkles,
  RefreshCw,
  LogIn,
  AlertCircle
} from 'lucide-react';

const getCurrentThaiMonthAndYear = () => {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const date = new Date();
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543; // Thai Buddhist Calendar
  return `${month} ${year}`;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [bypassActive, setBypassActive] = useState(() => getBypassFirebase());

  const isCloudActive = isFirebaseConfigured && !bypassActive;

  // 1. Subscribe to User Authentication State Change
  useEffect(() => {
    const unsubscribe = api.subscribeAuth((changedUser) => {
      setUser(changedUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch or Subscribe to User Transaction collection once authenticated
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setIsDataLoading(true);
    const unsubscribe = api.subscribeTransactions(user.uid, (txs) => {
      setTransactions(txs);
      setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Auth logins handler
  const handleLogin = async () => {
    try {
      setLoginError(null);
      await api.loginWithGoogle();
    } catch (e: any) {
      console.error('Login error:', e);
      setLoginError(e?.message || String(e));
    }
  };

  const handleActivateBypass = () => {
    setBypassFirebase(true);
    setBypassActive(true);
    setLoginError(null);
  };

  const handleDeactivateBypass = () => {
    setBypassFirebase(false);
    setBypassActive(false);
    setUser(null);
  };

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      await api.logout();
      setEditingTransaction(null);
    }
  };

  // Create or Update operations
  const handleSaveTransaction = async (formData: Omit<Transaction, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    
    if (editingTransaction) {
      await api.updateTransaction(user.uid, editingTransaction.id, formData);
      setEditingTransaction(null);
    } else {
      await api.addTransaction(user.uid, formData);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    await api.deleteTransaction(user.uid, id);
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  // Select Transaction for editing
  const handleEditSelect = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    // Smooth scroll form into view on mobile
    const formElement = document.getElementById('transaction-form-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Summarize calculations
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    });

    const net = income - expense;
    return {
      income,
      expense,
      net,
    };
  }, [transactions]);

  // Dynamic status bar details
  const databaseStatusLabel = isFirebaseConfigured
    ? 'เชื่อมต่อคลาวด์จริง (Firebase)'
    : 'จำลองข้อมูลเฉพาะเครื่อง (Local Database)';

  const databaseStatusIcon = isFirebaseConfigured ? (
    <Database className="w-3.5 h-3.5 text-emerald-500" />
  ) : (
    <CloudOff className="w-3.5 h-3.5 text-amber-500" />
  );

  const databaseStatusStyle = isFirebaseConfigured
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
    : 'bg-amber-50 text-amber-700 border-amber-100/50';

  // Auth Loading Screen Display
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans animate-pulse" id="app-auth-loading">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-xs text-slate-400">กำลังเตรียมเซิร์ฟเวอร์ระบบบัญชี FinTrack...</p>
      </div>
    );
  }

  // Welcome / Authentication Splash Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" id="login-splash">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg space-y-6" id="login-card">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner" id="logo-icon-container">
            <PiggyBank className="w-8 h-8" />
          </div>
          
          <div className="space-y-2" id="login-copy">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight" id="login-title">
              สมุดบัญชีรายรับ-รายจ่าย
            </h2>
            <p className="text-sm text-slate-500" id="login-subtitle">
              วิเคราะห์รายจ่าย แยกแยะรายรับ เปรียบเทียบผลลัพธ์รายเดือน ด้วยแดชบอร์ดอัจฉริยะดูง่ายในสไตล์ Professional Polish
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left space-y-2 text-xs text-amber-950 font-medium" id="login-notice">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ระบบจัดเก็บข้อมูลออฟไลน์สำรอง</span>
            </div>
            <p className="leading-relaxed text-amber-900/80">
              ตัวแอปติดตั้งระบบเก็บประจุภายในเครื่องให้เสร็จสรรพ สามารถเชื่อมต่อนโยบายความปลอดภัย และเข้าใช้งานโหมดออฟไลน์ได้ทันทีเมื่อไม่มีระบบคลาวด์
            </p>
          </div>

          <div className="space-y-3 pt-2" id="login-actions">
            <button
              onClick={handleLogin}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm shadow-md shadow-blue-600/10 cursor-pointer transition-all flex items-center justify-center gap-2"
              id="google-login-btn"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบระบบบัญชี (Google Auth)
            </button>

            {isFirebaseConfigured && (
              <button
                onClick={handleActivateBypass}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-semibold text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                id="bypass-login-btn"
              >
                เข้าใช้งานผ่าน Offline (Local Space) ทันที
              </button>
            )}
          </div>

          {loginError && (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-left text-xs text-rose-950 space-y-3.5" id="login-error-card">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ (Auth Error)</span>
              </div>
              
              <div className="text-[11px] leading-relaxed space-y-2.5">
                {loginError.includes('unauthorized-domain') ? (
                  <>
                    <p className="font-semibold text-rose-800">แนะนำวิธีแก้ไข (2 ขั้นตอนสั้นๆ):</p>
                    
                    <div className="space-y-2">
                      <p className="font-medium text-slate-800">1. คัดลอก "ทั้งสองดีไซน์โดเมน" ไปเพิ่มใน Firebase Console:</p>
                      <p className="text-slate-500 text-[10px]">ไปที่ Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains แล้วกด Add Domain และเพิ่ม 2 โดเมนนี้:</p>
                      
                      {/* Domain 1: DEV */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">โดเมนแสดงผลตอนพัฒนา (Dev):</span>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          <input 
                            type="text" 
                            readOnly 
                            value="ais-dev-udano2khb4yqnsbyr43jhg-654947851578.asia-southeast1.run.app" 
                            className="flex-1 bg-transparent border-0 text-[10px] font-mono font-medium outline-hidden select-all"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("ais-dev-udano2khb4yqnsbyr43jhg-654947851578.asia-southeast1.run.app");
                              alert('คัดลอกโดเมน Dev สำเร็จ!');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 cursor-pointer"
                          >
                            คัดลอก
                          </button>
                        </div>
                      </div>

                      {/* Domain 2: PRE */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">โดเมนเวอร์ชันแชร์ (Shared Preview):</span>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                          <input 
                            type="text" 
                            readOnly 
                            value="ais-pre-udano2khb4yqnsbyr43jhg-654947851578.asia-southeast1.run.app" 
                            className="flex-1 bg-transparent border-0 text-[10px] font-mono font-medium outline-hidden select-all"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("ais-pre-udano2khb4yqnsbyr43jhg-654947851578.asia-southeast1.run.app");
                              alert('คัดลอกโดเมน Preview สำเร็จ!');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 cursor-pointer"
                          >
                            คัดลอก
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white/60 border border-rose-100 rounded-xl space-y-1 mt-2.5">
                      <p className="font-semibold text-rose-800 flex items-center gap-1 text-[11px]">
                        💡 คำแนะนำพิเศษ: เปิดใช้งานในหน้าต่างใหม่
                      </p>
                      <p className="text-slate-600 text-[10px] leading-relaxed">
                        เนื่องจากเบราว์เซอร์ปัจจุบันมักปิดกั้นคุ้กกี้ใน Iframe (3rd Party Cookies Block) ให้กดปุ่ม <strong>"เปิดในหน้าต่างใหม่" (Open in new window)</strong> ที่แถบด้านขวาบนของตัวอย่างผลลัพธ์ เพื่อใช้งานบัญชีโดยไม่อยู่ภายใต้เฟรม Iframe ของ AI Studio
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="font-mono bg-white/50 p-1.5 rounded border border-rose-100 break-all">{loginError}</p>
                )}
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400" id="login-footer">
            พัฒนาตัวระบบโดยใช้ React + Tailwind CSS + Firebase Security Cloud
          </div>
        </div>
      </div>
    );
  }

  // Primary Dashboard Screen
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col xl:flex-row" id="app-dashboard-root">
      
      {/* Dynamic Navigation/Profile side layout for Desktop, Header for mobile */}
      <aside className="w-full xl:w-80 bg-white xl:min-h-screen border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col justify-between shrink-0 p-6 shadow-xs" id="navigation-sidebar">
        
        <div className="space-y-6" id="sidebar-top-group">
          {/* Logo brand */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100" id="sidebar-brand">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white" id="brand-avatar">
              <PiggyBank className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base tracking-tight" id="brand-name">FinTrack</h1>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold" id="brand-tag">บัญชีรายรับ-รายจ่าย</p>
            </div>
          </div>

          {/* Connected state pill matched with the dark card design */}
          <div className="p-5 bg-slate-950 rounded-2xl text-white shadow-xs" id="status-pill-box">
            <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-medium tracking-wider">สถานะการเก็บข้อมูล</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`w-2.5 h-2.5 rounded-full ${isCloudActive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
              <span className="text-xs font-semibold">
                {isCloudActive ? 'Connected (Firebase Cloud)' : 'Guest Offline (Local Space)'}
              </span>
            </div>
            {bypassActive && (
              <button
                onClick={handleDeactivateBypass}
                className="mt-3.5 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-[10px] rounded-xl text-white font-bold transition-all cursor-pointer shadow-indigo-500/10 text-center"
              >
                ลองเชื่อมต่อคลาวด์อีกครั้ง &rarr;
              </button>
            )}
          </div>

          {/* Prompt/Guide to explain Local Storage in details */}
          {!isFirebaseConfigured && (
            <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl space-y-2 text-xs text-blue-900" id="quick-tip-panel">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>คำแนะนำระบบคลาวด์</span>
              </div>
              <p className="leading-relaxed text-slate-600">
                หากต้องการซิงค์ข้ามอุปกรณ์ สามารถติดต่อเจ้าของแอปเพื่อผูกกับข้อมูลกับระบบฐานข้อมูลฟรี Firebase ทันที!
              </p>
            </div>
          )}
        </div>

        {/* User profile layout */}
        <div className="pt-6 border-t border-slate-100 space-y-4" id="sidebar-user-group">
          <div className="flex items-center gap-3" id="user-metadata">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName} 
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-50"
                referrerPolicy="no-referrer"
                id="user-profile-avatar"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200" id="user-profile-fallback">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0" id="user-names">
              <p className="text-xs font-semibold text-slate-800 truncate" id="user-display-name">
                {user.displayName || 'ผู้ใช้ทั่วไป (Guest)'}
              </p>
              <p className="text-[10px] text-slate-400 truncate" id="user-email-address">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-center text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            id="user-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>

      </aside>

      {/* Main applet content stage */}
      <main className="flex-1 min-w-0 p-6 md:p-8 space-y-6" id="dashboard-stage">
        
        {/* Header Title Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="stage-header">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight" id="stage-title">
              สรุปผลการเงินบัญชีประจำเดือน {getCurrentThaiMonthAndYear()}
            </h2>
            <p className="text-xs text-slate-500 mt-1" id="stage-subtitle">แผงควบคุมหลักวิเคราะห์รายรับรายจ่ายแบบเรียลไทม์</p>
          </div>
        </div>

        {/* Dynamic Summary Cards widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="summary-cards-row">
          <DashboardCard
            title="ยอดเงินคงเหลือสุทธิ"
            amount={summary.net}
            icon={<Wallet className="w-6 h-6 text-blue-600" id="summary-icon-balance" />}
            colorClass="bg-blue-50 text-blue-600"
            trendText={summary.net >= 0 ? '+ คงเหลือเป็นบวก' : '- สุธิติดลบ'}
            subtextColor={summary.net >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}
          />
          <DashboardCard
            title="รายรับเดือนนี้"
            amount={summary.income}
            icon={<TrendingUp className="w-6 h-6 text-emerald-600" id="summary-icon-income" />}
            colorClass="bg-emerald-50 text-emerald-600"
            trendText="สะสมรวมขาเข้าทั้งหมด"
            subtextColor="text-slate-400"
          />
          <DashboardCard
            title="รายจ่ายเดือนนี้"
            amount={summary.expense}
            icon={<TrendingDown className="w-6 h-6 text-rose-600" id="summary-icon-expense" />}
            colorClass="bg-rose-50 text-rose-600"
            trendText="สะสมรวมขาออกตามหมวดหมู่"
            subtextColor="text-rose-500"
          />
        </div>

        {/* Layout Row: Transaction Register Form & Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="form-charts-row">
          
          {/* Transaction Register Form Column */}
          <div className="lg:col-span-4" id="form-column">
            <TransactionForm
              onSave={handleSaveTransaction}
              editingTransaction={editingTransaction}
              onCancelEdit={() => setEditingTransaction(null)}
            />
          </div>

          {/* Analytics Charts (Recharts) Column */}
          <div className="lg:col-span-8 space-y-6" id="charts-column">
            <FinanceCharts transactions={transactions} />
          </div>

        </div>

        {/* Ledger Transaction History List table */}
        <div className="w-full" id="history-row">
          <TransactionList
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            onEditSelect={handleEditSelect}
            isLoading={isDataLoading}
          />
        </div>

      </main>

    </div>
  );
}
