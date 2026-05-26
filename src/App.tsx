import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  Calendar
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

const formatThaiMonthYear = (yearMonthStr: string) => {
  if (!yearMonthStr || yearMonthStr === 'all') return 'ประวัติทั้งหมด';
  const parts = yearMonthStr.split('-');
  if (parts.length < 2) return yearMonthStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const monthIndex = month - 1;
  const thaiMonth = months[monthIndex] || String(month);
  const thaiYear = year + 543;
  return `${thaiMonth} ${thaiYear}`;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginErrorType, setLoginErrorType] = useState<'already-in-use' | 'invalid-credential' | 'google-auth-failed' | null>(null);
  const [bypassActive, setBypassActive] = useState<boolean>(() => getBypassFirebase());
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Form states for login screen
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isCloudModeInput, setIsCloudModeInput] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Find current month string (e.g. "2026-05")
  const currentMonthStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Dynamically extract all unique months populated across existing entries
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include today's current month in the dropdown choices
    monthsSet.add(currentMonthStr);
    
    transactions.forEach(tx => {
      if (tx.date && tx.date.length >= 7) {
        monthsSet.add(tx.date.substring(0, 7));
      }
    });
    
    // Sort descending so newest months are on top
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions, currentMonthStr]);

  // Compute transactions filtered by the chosen month
  const filteredTxs = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(tx => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const isCloudActive = isFirebaseConfigured && !bypassActive;

  // Subscribe to Auth State Changes
  useEffect(() => {
    const unsubscribe = api.subscribeAuth((changedUser) => {
      setUser(changedUser);
      setBypassActive(getBypassFirebase());
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Google Auth Redirect Results on Mount
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const redirectUser = await api.checkRedirectResult();
        if (redirectUser) {
          setUser(redirectUser);
        }
      } catch (err: any) {
        console.error("Redirect auth error captured on startup:", err);
        setLoginError('🔒 ข้อผิดพลาดจากการป้องกันของเบราว์เซอร์หรือสิทธิ์โดเมน: ไม่สามารถแสดงหน้าต่างล็อกอิน Google ได้ หรือยังไม่ได้ลงทะเบียน Authorized Domains ใน Firebase Console');
        setLoginErrorType('google-auth-failed');
      }
    };
    checkRedirect();
  }, []);

  // Subscribe to transaction store
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

  // Create or Update operations
  const handleSaveTransaction = async (formData: Omit<Transaction, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    
    if (editingTransaction) {
      await api.updateTransaction(user.uid, editingTransaction.id, formData);
      setEditingTransaction(null);
    } else {
      await api.addTransaction(user.uid, formData);
      if (formData.date && formData.date.length >= 7) {
        const addedMonth = formData.date.substring(0, 7);
        setSelectedMonth(addedMonth);
      }
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
    
    filteredTxs.forEach((tx) => {
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
  }, [filteredTxs]);

  // Dynamic status bar details
  const databaseStatusLabel = isCloudActive
    ? 'เชื่อมต่อคลาวด์จริง (Firebase)'
    : 'บันทึกปลอดภัยในเครื่อง (Local Storage)';

  const databaseStatusIcon = isCloudActive ? (
    <Database className="w-3.5 h-3.5 text-emerald-500" />
  ) : (
    <CloudOff className="w-3.5 h-3.5 text-amber-500" />
  );

  const databaseStatusStyle = isCloudActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
    : 'bg-amber-50 text-amber-700 border-amber-100/50';

  // Login action handlers
  const handleEmailLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      setLoginError('กรุณากรอกอีเมลของคุณ');
      setLoginErrorType(null);
      return;
    }
    try {
      setLoginError(null);
      setLoginErrorType(null);
      await api.loginWithEmailLocal(loginEmail);
    } catch (err: any) {
      setLoginError(err?.message || String(err));
      setLoginErrorType(null);
    }
  };

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('กรุณากรอกอีเมลและรหัสผ่าน');
      setLoginErrorType(null);
      return;
    }
    try {
      setLoginError(null);
      setLoginErrorType(null);
      if (isSignUp) {
        await api.registerWithEmailAndPassword(loginEmail, loginPassword);
      } else {
        await api.loginWithEmailAndPassword(loginEmail, loginPassword);
      }
    } catch (err: any) {
      console.error('Firebase authentication error:', err);
      const errorCode = err?.code || '';
      const errorMessage = err?.message || String(err);
      
      let msg = '';
      let type: 'already-in-use' | 'invalid-credential' | null = null;
      
      if (errorCode === 'auth/email-already-in-use' || errorMessage.includes('auth/email-already-in-use')) {
        msg = '⚠️ อีเมลนี้มีอยู่ในคลาวด์แล้ว: หากต้องการใช้บัญชีนี้ ให้กดสลับโหมดไปเป็นหน้า "เข้าสู่ระบบคลาวด์" (หรือจะเลือกโหมด "บัญชีประจำเครื่อง" ก็ได้โดยตรง)';
        type = 'already-in-use';
      } else if (
        errorCode === 'auth/invalid-credential' || 
        errorMessage.includes('auth/invalid-credential') ||
        errorCode === 'auth/user-not-found' ||
        errorMessage.includes('auth/user-not-found') ||
        errorCode === 'auth/wrong-password' ||
        errorMessage.includes('auth/wrong-password')
      ) {
        msg = '❌ รหัสผ่านไม่ถูกต้อง หรือยังไม่มีบัญชีสมาชิกนี้บนคลาวด์: กรุณาคลิกเพื่อลองสมัครสมาชิกใหม่ หรือเปลี่ยนไปใช้ระบบ บัญชีเซกเมนต์ประจำเครื่อง ได้โดยตรงครับ';
        type = 'invalid-credential';
      } else if (errorCode === 'auth/weak-password' || errorMessage.includes('auth/weak-password')) {
        msg = '🔒 รหัสผ่านสั้นเกินไป: ทางระบบความปลอดภัยของคลาวด์ต้องการรหัสผ่านอย่างน้อย 6 ตัวอักษรขึ้นไป';
      } else if (errorCode === 'auth/invalid-email' || errorMessage.includes('auth/invalid-email')) {
        msg = '✉️ รูปแบบอีเมลไม่ถูกต้อง: กรุณาป้อนอีเมลให้เรียบร้อย เช่น name@example.com';
      } else if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('auth/operation-not-allowed')) {
        msg = '🚫 บริการภายนอกไม่ได้เปิดสิทธิ์: ล็อกอินแบบใช้อีเมล/รหัสผ่านใน Firebase Console ยังไม่เปิดให้บริการ แนะนำให้ใช้ตัวเลือก "บัญชีประจำเครื่อง (Local)" ด้านบนแทนพอร์ตเซิร์ฟเวอร์ครับ';
      } else {
        msg = `พบข้อผิดพลาด: ${errorMessage || errorCode}`;
      }
      
      setLoginError(msg);
      setLoginErrorType(type);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError(null);
      setLoginErrorType(null);
      await api.loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setLoginError('🔒 ข้อผิดพลาดจากการป้องกันของเบราว์เซอร์: ไม่สามารถแสดงป๊อปอัป Google ลงชื่อเข้าใช้ใน Sandbox (iFrame) ได้ หรือยังไม่ได้ตั้งค่า Authorized Domains ใน Firebase');
      setLoginErrorType('google-auth-failed');
    }
  };

  const handleGoogleRedirectLogin = async () => {
    try {
      setLoginError(null);
      setLoginErrorType(null);
      await api.loginWithGoogleRedirect();
    } catch (err: any) {
      console.error(err);
      setLoginError('🔒 ข้อผิดพลาดจากการป้องกันของเบราว์เซอร์หรือสิทธิ์โดเมน: กรุณาตรวจสอบการตั้งค่า Authorized Domains ใน Firebase Console');
      setLoginErrorType('google-auth-failed');
    }
  };

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
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6" id="login-card">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner" id="logo-icon-container">
            <PiggyBank className="w-8 h-8" />
          </div>
          
          <div className="space-y-2 text-center" id="login-copy">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight" id="login-title">
              FinTrack สมุดบัญชีรายรับ-รายจ่าย
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto" id="login-subtitle">
              แยกบัญชีด้วยอีเมลส่วนตัวของตนเอง ใช้งานได้พร้อมกันหรือสลับเปลี่ยนเพื่อความเป็นส่วนตัว
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl" id="mode-switcher-tabs">
            <button
              type="button"
              onClick={() => {
                setIsCloudModeInput(false);
                setLoginError(null);
                setLoginErrorType(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                !isCloudModeInput 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              บัญชีประจำเครื่อง (Local)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCloudModeInput(true);
                setLoginError(null);
                setLoginErrorType(null);
              }}
              className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isCloudModeInput 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              บัญชีเซิร์ฟเวอร์คลาวด์
            </button>
          </div>

          <form onSubmit={isCloudModeInput ? handleEmailPasswordAuth : handleEmailLocalLogin} className="space-y-4" id="login-form">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">อีเมลของคุณ</label>
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
              />
            </div>

            {isCloudModeInput && (
              <div className="space-y-1.5 focus-within:animate-pulse">
                <label className="text-xs font-semibold text-slate-600 block">รหัสผ่านบัญชี</label>
                <input
                  type="password"
                  required
                  placeholder="รหัสผ่านอย่างน้อย 6 หลัก"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            )}

            {/* Submit Action Block */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-600/15 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isCloudModeInput 
                  ? (isSignUp ? 'ยืนยันการสมัครและเชื่อมคลาวด์' : 'ล็อกอินเข้าสู่คลาวด์') 
                  : 'เข้าสู่แผงบัญชีทันที'
                }
              </button>
            </div>
          </form>

          {/* Cloud Toggle Sign-up / Sign-in */}
          {isCloudModeInput && (
            <div className="flex justify-center text-xs font-medium" id="toggle-signup-link">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                {isSignUp ? 'มีบัญชีแล้ว? เข้าสู่ระบบคลาวด์' : 'ยังไม่มีบัญชีคลาวด์? สมัครสมาชิกที่นี่'}
              </button>
            </div>
          )}

          {/* Social Sign In Fallback for Cloud */}
          {isCloudModeInput && isFirebaseConfigured && (
            <div className="space-y-3 pt-2" id="alternative-sign-in">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase tracking-wider justify-center">
                <div className="h-[1px] bg-slate-200 w-10"></div>
                <span>หรือระบุสิทธิ์ด้วย Google</span>
                <div className="h-[1px] bg-slate-200 w-10"></div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs"
                >
                  💬 ล็อกอินด่วนด้วย Google Auth Popup
                </button>
                <button
                  type="button"
                  onClick={handleGoogleRedirectLogin}
                  className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-2xs"
                  title="แนะนำสำหรับเบราว์เซอร์ที่บล็อก Pop-up และการันตีผ่านระบบ Redirect"
                >
                  🌐 ล็อกอินผ่าน Google Redirect (แนะนำเมื่อติดปัญหา)
                </button>
              </div>

              {isInIframe && (
                <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl text-[11px] text-amber-900 leading-relaxed font-semibold space-y-1.5 animate-fade-in" id="iframe-google-auth-notice">
                  <div className="flex items-center gap-1 font-bold text-amber-950">
                    <span>💡 แนะนำสำหรับการใช้งานใน Sandbox (iFrame):</span>
                  </div>
                  <div>
                    เบราว์เซอร์จะบล็อกส่วนป๊อปอัป Google ลงชื่อเข้าใช้เพื่อความปลอดภัย คุณสามารถ:
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCloudModeInput(false);
                        setLoginError(null);
                        setLoginErrorType(null);
                      }}
                      className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] cursor-pointer text-center select-none"
                    >
                      ⚡ สลับเป็นโหมด "บัญชีประจำเครื่อง (Local)" (ดีสุดในแซนบ็อกซ์)
                    </button>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px] cursor-pointer text-center block select-none"
                    >
                      🌐 คลิกเพื่อรันแอปบนหน้านอก (New Tab) เพื่อเปิดใช้ Google Popup
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message area */}
          {loginError && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-850 space-y-3" id="login-error-display">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span className="text-[13px] font-bold">คำแนะนำแก้ไขปัญหา</span>
                </div>
                <p className="leading-relaxed font-semibold text-rose-900 text-xs">{loginError}</p>
              </div>

              {/* Dynamic CTA Helpful Actions on Cloud Errors */}
              {loginErrorType === 'already-in-use' && (
                <div className="pt-1 flex flex-col gap-1.5" id="error-action-already-in-use">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setLoginError(null);
                      setLoginErrorType(null);
                    }}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    สลับไปหน้า "เข้าสู่ระบบ (Sign In)" เพื่อล็อกอินด้วยรหัสผ่าน
                  </button>
                </div>
              )}

              {loginErrorType === 'invalid-credential' && (
                <div className="pt-1 flex flex-col gap-2" id="error-action-invalid-credential">
                  <div className="text-[11px] text-rose-800 font-bold bg-rose-100/50 p-2 rounded-lg leading-relaxed">
                    💡 หากคุณเพิ่งเริ่มใช้และยังไม่มีบัญชีด้วยอีเมลนี้ กรุณากดปุ่มสมัครสมาชิกด้านล่างก่อนใช้งาน หรือสลับไปใช้บัญชีประจำเครื่องได้สะดวกทันที:
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setLoginError(null);
                      setLoginErrorType(null);
                    }}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    🤝 สมัครสมาชิกใหม่ (Sign Up) สำหรับอีเมลนี้ทันที
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoginError(null);
                        setLoginErrorType(null);
                        setIsCloudModeInput(false);
                        await api.loginWithEmailLocal(loginEmail);
                      } catch (err: any) {
                        setLoginError(err?.message || String(err));
                        setLoginErrorType(null);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    ⚡ ดำเนินการต่อด้วย "บัญชีประจำเครื่อง (Local)" โดยไม่ต้องใช้รหัสผ่าน
                  </button>
                </div>
              )}

              {loginErrorType === 'google-auth-failed' && (
                <div className="pt-1 flex flex-col gap-3" id="error-action-google-auth-failed">
                  <div className="text-[11px] text-slate-700 bg-amber-50 p-3.5 rounded-xl border border-amber-100 leading-relaxed space-y-2 font-sans">
                    <p className="font-bold text-amber-955 flex items-center gap-1">
                      <span>🛠️ วิธีแก้ไขปัญหาโดเมนบล็อก (Authorized Domains) บน Vercel:</span>
                    </p>
                    <p>
                      สาเหตุหลักเกิดจากสิทธิ์ความปลอดภัย โดยโดเมนที่เปิดอยู่ ณ ตอนนี้ ยังไม่ได้ถูกลงทะเบียนในคอนโซลของ Google Firebase
                    </p>
                    <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200 font-mono text-[11px] text-amber-950 select-all break-all flex flex-col gap-1 shadow-2xs">
                      <span className="text-[9px] text-slate-500 font-bold tracking-wider">คัดลอกค่านี้ไปใช้:</span>
                      <strong className="text-blue-700 bg-blue-50/50 px-1.5 py-0.5 border border-blue-100 rounded break-all font-semibold font-mono">{window.location.hostname}</strong>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 font-semibold pl-1 text-[10.5px]">
                      <li>เปิด <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-bold">Firebase Console 🔗</a> ของท่าน</li>
                      <li>ไปที่เมนู <strong>Authentication</strong> ด้านซ้าย</li>
                      <li>คลิกแท็บ <strong>Settings</strong> ด้านซ้าย/บน แล้วเลือกเมนูย่อย <strong>Authorized domains</strong></li>
                      <li>คลิกปุ่ม <strong>"Add domain"</strong> แล้วนำค่าโดเมนสีน้ำเงินด้านบนนี้ไปใส่ และกดบันทึก</li>
                    </ol>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleGoogleRedirectLogin}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      🔁 ลองใช้ Google Redirect (ลดปัญหาระบบป๊อปอัปบล็อก)
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setLoginError(null);
                          setLoginErrorType(null);
                          setIsCloudModeInput(false);
                          await api.loginWithEmailLocal(loginEmail || "guest@fintrack.local");
                        } catch (err: any) {
                          setLoginError(err?.message || String(err));
                          setLoginErrorType(null);
                        }
                      }}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      ⚡ เปลี่ยนไปใช้งาน "บัญชีประจำเครื่อง (Local)" (เข้าใช้ได้ทันที)
                    </button>
                    
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs block"
                    >
                      🌐 เปิดแอปหน้าแท็บใหม่แบบเต็มรูปแบบ (New Tab)
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/70 text-left space-y-1.5 text-[11px] text-slate-600" id="login-guide">
            <p className="font-bold text-slate-700">💡 เพิ่มเติมเพื่อการใช้งานที่ดีที่สุด:</p>
            <p className="leading-relaxed">
              * เมลประจำเครื่อง (Local) บันทึกในเบราว์เซอร์คุณโดยตรง ปลอดภัย ไม่ผ่านเซิร์ฟเวอร์ เหมาะกับผู้ใช้ทั่วไป<br/>
              * ทุกอีเมลจำกัดเนื้อหาแยกจากกันอย่างเด็ดขาด ช่วยรักษาความปลอดภัยและความลับของข้อมูลได้อย่างดีเยี่ยม
            </p>
          </div>

          <div className="text-[10px] text-slate-400 text-center" id="login-footer">
            พัฒนาบัญชีด้วยระบบออฟไลน์สมบูรณ์แบบ + สนับสนุนคลาวด์ Firebase
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
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isCloudActive ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
              <span className="text-xs font-semibold font-mono text-slate-200">
                {isCloudActive ? 'คลาวด์เซิร์ฟเวอร์ (Cloud)' : 'เซกเมนต์ในเครื่อง (Local)'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 font-medium truncate">
              อีเมลบัญชี: {user.email}
            </p>
          </div>

          {/* Prompt/Guide to explain Local Storage in details */}
          {!isCloudActive && (
            <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl space-y-2 text-xs text-blue-900" id="quick-tip-panel">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>ความปลอดภัยของข้อมูล</span>
              </div>
              <p className="leading-relaxed text-slate-600">
                เมื่อพิมพ์อีเมลใดๆ ระบบจะแยกข้อมูลบัญชีของคุณ ออกจากอีเมลอื่นอย่างเด็ดขาด ให้คุณสามารถจัดการข้อมูลเป็นรายบุคคลอย่างเป็นส่วนตัว
              </p>
            </div>
          )}
        </div>

        {/* User profile layout */}
        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 animate-fade-in" id="sidebar-user-group">
          <div className="flex items-center gap-3" id="user-metadata">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0" id="user-profile-fallback">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0" id="user-names">
              <p className="text-xs font-semibold text-slate-800 truncate" id="user-display-name">
                {user.displayName || 'ผู้ใช้แอป FinTrack'}
              </p>
              <p className="text-[10px] text-slate-400 truncate" id="user-email-address">
                {user.email}
              </p>
            </div>
          </div>

          {showLogoutConfirm ? (
            <div className="flex flex-col gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-xl animate-fade-in" id="logout-confirm-box">
              <p className="text-[10px] text-rose-800 font-bold text-center leading-relaxed">
                ยืนยันเพื่อออกจากระบบ / สลับอีเมลคีย์?
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    api.logout();
                    setEditingTransaction(null);
                    setShowLogoutConfirm(false);
                  }}
                  className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors"
                  id="confirm-logout-btn"
                >
                  ใช่, ล็อกเอาต์
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors"
                  id="cancel-logout-btn"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full py-2 px-3 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-center text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              id="user-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500 hover:rotate-12 transition-transform" />
              ออกจากระบบ / สลับอีเมล
            </button>
          )}
        </div>

        {/* Minimalist brand footer */}
        <div className="pt-4 border-t border-slate-100" id="sidebar-footer-group">
          <p className="text-[10px] text-slate-400 leading-relaxed font-sans" id="footer-copy">
            FinTrack บันทึกบัญชีด้วยระบบแยกแยะเมลส่วนตัว ข้อมูลรันบนเบราว์เซอร์อย่างปลอดภัย 100%
          </p>
        </div>

      </aside>

      {/* Main applet content stage */}
      <main className="flex-1 min-w-0 p-6 md:p-8 space-y-6" id="dashboard-stage">
        
        {/* Header Title Area with Dynamically Pickable Month Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs" id="stage-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0" id="header-calendar-icon">
              <Calendar className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight" id="stage-title">
                สรุปผลการเงินประจำ{selectedMonth === 'all' ? 'ประวัติทั้งหมด' : `เดือน ${formatThaiMonthYear(selectedMonth)}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5" id="stage-subtitle">แผงควบคุมหลักวิเคราะห์รายรับรายจ่ายของคุณตามหน้าประวัติได้อย่างแม่นยำ</p>
            </div>
          </div>

          {/* Month Dropdown Selector with clean local styling */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-50 p-1.5 rounded-xl border border-slate-100" id="month-selector-group">
            <span className="text-[11px] font-bold text-slate-500 font-sans pl-2 select-none">สลับเดือน:</span>
            <select
              id="month-select-dropdown"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 focus:border-blue-600 transition-all cursor-pointer shadow-2xs font-sans min-w-[150px]"
            >
              <option value="all">📂 ประวัติทั้งหมด (ทุกเดือน)</option>
              {availableMonths.map((mStr) => (
                <option key={mStr} value={mStr}>
                  📅 {formatThaiMonthYear(mStr)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Summary Cards widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="summary-cards-row">
          <DashboardCard
            title={selectedMonth === 'all' ? 'ยอดเงินคงเหลือสะสมสุทธิ' : 'ยอดเงินคงเหลือสุทธิ'}
            amount={summary.net}
            icon={<Wallet className="w-6 h-6 text-blue-600" id="summary-icon-balance" />}
            colorClass="bg-blue-50 text-blue-600"
            trendText={summary.net >= 0 ? '+ คงเหลือเป็นบวก' : '- สุธิติดลบ'}
            subtextColor={summary.net >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}
          />
          <DashboardCard
            title={selectedMonth === 'all' ? 'รายรับสะสมทั้งหมด' : 'รายรับประจำเดือนนี้'}
            amount={summary.income}
            icon={<TrendingUp className="w-6 h-6 text-emerald-600" id="summary-icon-income" />}
            colorClass="bg-emerald-50 text-emerald-600"
            trendText="สะสมรวมขาเข้าทั้งหมด"
            subtextColor="text-slate-400"
          />
          <DashboardCard
            title={selectedMonth === 'all' ? 'รายจ่ายสะสมทั้งหมด' : 'รายจ่ายประจำเดือนนี้'}
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
            <FinanceCharts transactions={transactions} selectedMonth={selectedMonth} />
          </div>

        </div>

        {/* Ledger Transaction History List table */}
        <div className="w-full" id="history-row">
          <TransactionList
            transactions={filteredTxs}
            onDelete={handleDeleteTransaction}
            onEditSelect={handleEditSelect}
            isLoading={isDataLoading}
          />
        </div>

      </main>

    </div>
  );
}
