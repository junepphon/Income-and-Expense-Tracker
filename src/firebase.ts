import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Transaction } from './types';

// Check if Firebase is genuinely configured by the user
export const isFirebaseConfigured = !!(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
);

let app;
export let db: any = null;
export let auth: any = null;
export const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization custom error:', error);
  }
}

// Security: Enforce JSON format for insufficient permissions errors
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'anonymous',
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((p: any) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local mock data fallback database (offline Mode / simulated)
const LOCAL_STORAGE_KEY = 'income_expense_transactions';

function getLocalTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading localStorage', e);
    return [];
  }
}

function saveLocalTransactions(transactions: Transaction[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
}

// Runtime Firebase override flag to backup users on domain auth blockages
let bypassFirebase = localStorage.getItem('firebase_bypass_active') === 'true';

export function getBypassFirebase(): boolean {
  return bypassFirebase;
}

export function setBypassFirebase(value: boolean) {
  bypassFirebase = value;
  if (value) {
    localStorage.setItem('firebase_bypass_active', 'true');
    const mockUser = {
      uid: 'mock_user_123',
      displayName: 'ผู้ใช้ทั่วไป (Guest Local Live)',
      email: 'guest@fintrack.local',
      emailVerified: true,
      photoURL: null,
    };
    localStorage.setItem('mock_user_session', JSON.stringify(mockUser));
  } else {
    localStorage.removeItem('firebase_bypass_active');
    localStorage.removeItem('mock_user_session');
  }
  // Dispatch a storage and custom event to force reactive updates
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('firebase-bypass-changed'));
}

// Unified API handles both Firebase Storage and Fallback Local Storage
export const api = {
  // Sign in
  loginWithGoogle: async () => {
    if (isFirebaseConfigured && !bypassFirebase && auth) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (err) {
        console.error('Auth login error:', err);
        throw err;
      }
    } else {
      // Return a simulated user
      const mockUser = {
        uid: 'mock_user_123',
        displayName: 'ผู้ใช้ทั่วไป (Guest Local Live)',
        email: 'guest@fintrack.local',
        emailVerified: true,
        photoURL: null,
      };
      localStorage.setItem('mock_user_session', JSON.stringify(mockUser));
      window.dispatchEvent(new Event('storage'));
      return mockUser;
    }
  },

  // Log out
  logout: async () => {
    if (isFirebaseConfigured && !bypassFirebase && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem('mock_user_session');
      window.dispatchEvent(new Event('storage'));
    }
  },

  // Monitor Auth Changes
  subscribeAuth: (callback: (user: any) => void) => {
    let unsubscribeFirebase: (() => void) | null = null;
    let isUnsubscribed = false;

    const checkLocalMock = () => {
      const stored = localStorage.getItem('mock_user_session');
      callback(stored ? JSON.parse(stored) : null);
    };

    const setupAuthListener = () => {
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
        unsubscribeFirebase = null;
      }

      if (isFirebaseConfigured && !bypassFirebase && auth) {
        unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
          if (!isUnsubscribed) {
            callback(fbUser);
          }
        });
      } else {
        checkLocalMock();
      }
    };

    setupAuthListener();

    const handleStorageUpdate = () => {
      if (isUnsubscribed) return;
      if (!isFirebaseConfigured || bypassFirebase) {
        checkLocalMock();
      }
    };

    window.addEventListener('storage', handleStorageUpdate);
    const handleBypassChange = () => {
      if (isUnsubscribed) return;
      setupAuthListener();
    };
    window.addEventListener('firebase-bypass-changed', handleBypassChange);

    return () => {
      isUnsubscribed = true;
      if (unsubscribeFirebase) unsubscribeFirebase();
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('firebase-bypass-changed', handleBypassChange);
    };
  },

  // Get transactions
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    if (isFirebaseConfigured && !bypassFirebase && db) {
      const pathStr = 'transactions';
      try {
        const q = query(
          collection(db, pathStr),
          where('ownerId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const txs: Transaction[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          txs.push({
            id: docSnap.id,
            ...data,
          } as Transaction);
        });
        // Sort in memory by date descending to bypass composite index requirement
        txs.sort((a, b) => b.date.localeCompare(a.date));
        return txs;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, pathStr);
        return [];
      }
    } else {
      return getLocalTransactions().filter(tx => tx.ownerId === userId).sort((a, b) => b.date.localeCompare(a.date));
    }
  },

  // Subscribe to changes (Real-time update)
  subscribeTransactions: (userId: string, callback: (txs: Transaction[]) => void) => {
    if (isFirebaseConfigured && !bypassFirebase && db) {
      const pathStr = 'transactions';
      const q = query(
        collection(db, pathStr),
        where('ownerId', '==', userId)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          const txs: Transaction[] = [];
          snapshot.forEach((snap) => {
            txs.push({ id: snap.id, ...snap.data() } as Transaction);
          });
          // Sort in memory by date descending to bypass composite index requirement
          txs.sort((a, b) => b.date.localeCompare(a.date));
          callback(txs);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, pathStr);
        }
      );
    } else {
      // Local dynamic mock subscriber
      const handleStorageUpdate = () => {
        callback(getLocalTransactions().filter(tx => tx.ownerId === userId).sort((a, b) => b.date.localeCompare(a.date)));
      };
      handleStorageUpdate(); // primary call
      window.addEventListener('storage', handleStorageUpdate);
      // Let's create an interval to catch local changes in the same tab
      const intervalId = setInterval(handleStorageUpdate, 1500);
      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        clearInterval(intervalId);
      };
    }
  },

  // Create transaction
  addTransaction: async (userId: string, transaction: Omit<Transaction, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const timestampStr = new Date().toISOString();
    
    if (isFirebaseConfigured && !bypassFirebase && db) {
      const pathStr = `transactions`;
      // Generate unique document ID manually so validation of ID size succeeds cleanly in rules
      const docRef = doc(collection(db, pathStr));
      const newTx: Omit<Transaction, 'id'> = {
        ownerId: userId,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        description: transaction.description || '',
        createdAt: timestampStr,
        updatedAt: timestampStr,
      };

      try {
        await setDoc(docRef, newTx);
        return {
          id: docRef.id,
          ...newTx,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathStr);
        throw error;
      }
    } else {
      const newTx: Transaction = {
        id: 'tx_local_' + Math.random().toString(36).substring(2, 11),
        ownerId: userId,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
        description: transaction.description || '',
        createdAt: timestampStr,
        updatedAt: timestampStr,
      };
      const all = getLocalTransactions();
      all.push(newTx);
      saveLocalTransactions(all);
      return newTx;
    }
  },

  // Edit transaction
  updateTransaction: async (userId: string, transactionId: string, updates: Partial<Transaction>): Promise<void> => {
    const timestampStr = new Date().toISOString();
    
    if (isFirebaseConfigured && !bypassFirebase && db) {
      const pathStr = `transactions`;
      const docRef = doc(db, pathStr, transactionId);
      const sanitisedUpdates: any = {};
      const allowedKeys: (keyof Transaction)[] = ['amount', 'type', 'category', 'date', 'description'];
      
      allowedKeys.forEach(key => {
        if (updates[key] !== undefined) {
          if (key === 'amount') {
            sanitisedUpdates[key] = Number(updates[key]);
          } else {
            sanitisedUpdates[key] = updates[key];
          }
        }
      });
      sanitisedUpdates.updatedAt = timestampStr;

      try {
        await setDoc(docRef, sanitisedUpdates, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathStr);
        throw error;
      }
    } else {
      const all = getLocalTransactions();
      const idx = all.findIndex(t => t.id === transactionId && t.ownerId === userId);
      if (idx !== -1) {
        all[idx] = {
          ...all[idx],
          ...updates,
          amount: updates.amount !== undefined ? Number(updates.amount) : all[idx].amount,
          updatedAt: timestampStr,
        };
        saveLocalTransactions(all);
      }
    }
  },

  // Delete transaction
  deleteTransaction: async (userId: string, transactionId: string): Promise<void> => {
    if (isFirebaseConfigured && !bypassFirebase && db) {
      const pathStr = `transactions`;
      const docRef = doc(db, pathStr, transactionId);
      try {
        await deleteDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, pathStr);
        throw error;
      }
    } else {
      let all = getLocalTransactions();
      all = all.filter(t => !(t.id === transactionId && t.ownerId === userId));
      saveLocalTransactions(all);
    }
  }
};
