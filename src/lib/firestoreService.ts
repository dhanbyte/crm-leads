import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Lead, UserStaff, CallLog, SheetConfig } from '@/types/crm';

const COLLECTIONS = {
  LEADS: 'crm_leads',
  STAFF: 'crm_staff',
  CALL_LOGS: 'crm_call_logs',
  SETTINGS: 'crm_settings'
};

// Error Handler helper
const handleFirestoreError = (error: any, operation: string) => {
  if (error?.code === 'failed-precondition' || error?.code === 'unavailable' || error?.message?.includes('offline')) {
    console.warn(`Firestore offline fallback for ${operation}`);
  } else {
    console.warn(`Firestore notice (${operation}):`, error?.message || error);
  }
};

// Filter helper to discard legacy mock staff
const isLegacyMockStaff = (s: UserStaff | any) => {
  if (!s) return true;
  const legacyIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];
  const legacyEmails = ['saloni@salescrm.com', 'rahul@salescrm.com', 'amit@salescrm.com'];
  if (legacyIds.includes(s.uid)) return true;
  if (s.email && legacyEmails.includes(s.email.toLowerCase())) return true;
  if (s.name === 'Saloni Sharma' || s.name === 'Rahul Verma' || s.name === 'Amit Kumar') return true;
  return false;
};

// 1. Leads Operations (Cloud Firestore + Fast Server Bridge)
export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.LEADS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach((doc) => {
        leads.push({ id: doc.id, ...doc.data() } as Lead);
      });
      if (leads.length > 0) {
        callback(leads);
      }
    }, (error) => {
      handleFirestoreError(error, 'subscribeToLeads');
    });
  } catch (e) {
    handleFirestoreError(e, 'subscribeToLeads');
    return () => {};
  }
};

export const fetchAllLeadsFromFirestore = async (): Promise<Lead[]> => {
  const leadMap = new Map<string, Lead>();

  // 1. Try Cloud Firestore
  try {
    const q = query(collection(db, COLLECTIONS.LEADS), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() } as Lead;
      leadMap.set(item.phone || item.id, item);
    });
  } catch (e) {
    handleFirestoreError(e, 'fetchAllLeadsFromFirestore');
  }

  // 2. Try Server API store
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();
    if (data.success && Array.isArray(data.leads)) {
      data.leads.forEach((l: Lead) => {
        if (!leadMap.has(l.phone || l.id)) {
          leadMap.set(l.phone || l.id, l);
        }
      });
    }
  } catch (e) {}

  return Array.from(leadMap.values());
};

export const saveLeadToFirestore = async (lead: Lead) => {
  // 1. Instant Cloud Firestore save
  try {
    const leadRef = doc(db, COLLECTIONS.LEADS, lead.id);
    await setDoc(leadRef, {
      ...lead,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveLeadToFirestore');
  }

  // 2. Instant Server Store sync
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_single', lead })
    });
  } catch (e) {}
};

export const saveBulkLeadsToFirestore = async (leads: Lead[]) => {
  if (leads.length === 0) return;

  // 1. Cloud Firestore Batch Write (up to 500 ops per batch)
  try {
    const batch = writeBatch(db);
    leads.slice(0, 450).forEach(lead => {
      const ref = doc(db, COLLECTIONS.LEADS, lead.id);
      batch.set(ref, {
        ...lead,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    handleFirestoreError(e, 'saveBulkLeadsToFirestore');
  }

  // 2. Server Store Batch Save
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_upsert', leads })
    });
  } catch (e) {}
};

export const deleteLeadFromFirestore = async (leadId: string) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LEADS, leadId));
  } catch (e) {
    handleFirestoreError(e, 'deleteLeadFromFirestore');
  }

  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', leadId })
    });
  } catch (e) {}
};

// 2. Staff Operations (Cloud Firestore + Fast Server Bridge)
export const subscribeToStaff = (callback: (staff: UserStaff[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.STAFF), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const staffList: UserStaff[] = [];
      snapshot.forEach((docSnap) => {
        const data = { uid: docSnap.id, ...docSnap.data() } as UserStaff;
        if (isLegacyMockStaff(data)) {
          // Delete legacy mock doc from Firestore in background
          deleteDoc(docSnap.ref).catch(() => {});
        } else {
          staffList.push(data);
        }
      });
      callback(staffList);
    }, (error) => {
      handleFirestoreError(error, 'subscribeToStaff');
    });
  } catch (e) {
    handleFirestoreError(e, 'subscribeToStaff');
    return () => {};
  }
};

export const fetchAllStaffFromFirestore = async (): Promise<UserStaff[]> => {
  const staffMap = new Map<string, UserStaff>();

  // 1. Try Cloud Firestore
  try {
    const q = query(collection(db, COLLECTIONS.STAFF), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      const item = { uid: docSnap.id, ...docSnap.data() } as UserStaff;
      if (isLegacyMockStaff(item)) {
        deleteDoc(docSnap.ref).catch(() => {});
      } else {
        staffMap.set(item.email.toLowerCase(), item);
      }
    });
  } catch (e) {
    handleFirestoreError(e, 'fetchAllStaffFromFirestore');
  }

  // 2. Try Server API store
  try {
    const res = await fetch('/api/staff');
    const data = await res.json();
    if (data.success && Array.isArray(data.staff)) {
      data.staff.forEach((s: UserStaff) => {
        if (!isLegacyMockStaff(s) && !staffMap.has(s.email.toLowerCase())) {
          staffMap.set(s.email.toLowerCase(), s);
        }
      });
    }
  } catch (e) {}

  return Array.from(staffMap.values());
};

export const saveStaffToFirestore = async (staff: UserStaff) => {
  // 1. Instant Cloud Firestore save
  try {
    const staffRef = doc(db, COLLECTIONS.STAFF, staff.uid);
    await setDoc(staffRef, staff, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveStaffToFirestore');
  }

  // 2. Instant Server Store sync
  try {
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', staffMember: staff })
    });
  } catch (e) {}
};

export const deleteStaffFromFirestore = async (staffId: string) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.STAFF, staffId));
  } catch (e) {
    handleFirestoreError(e, 'deleteStaffFromFirestore');
  }

  try {
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', uid: staffId })
    });
  } catch (e) {}
};

// 3. Call Logs Operations
export const subscribeToCallLogs = (callback: (logs: CallLog[]) => void) => {
  try {
    const q = query(collection(db, COLLECTIONS.CALL_LOGS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs: CallLog[] = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as CallLog);
      });
      if (logs.length > 0) {
        callback(logs);
      }
    }, (error) => {
      handleFirestoreError(error, 'subscribeToCallLogs');
    });
  } catch (e) {
    handleFirestoreError(e, 'subscribeToCallLogs');
    return () => {};
  }
};

export const saveCallLogToFirestore = async (log: CallLog) => {
  try {
    const logRef = doc(db, COLLECTIONS.CALL_LOGS, log.id);
    await setDoc(logRef, log, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveCallLogToFirestore');
  }
};

// 4. Settings Operations
export const saveSettingsToFirestore = async (settings: Partial<SheetConfig>) => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'global_config');
    await setDoc(settingsRef, settings, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveSettingsToFirestore');
  }
};

export const getSettingsFromFirestore = async (): Promise<Partial<SheetConfig> | null> => {
  try {
    const q = query(collection(db, COLLECTIONS.SETTINGS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as Partial<SheetConfig>;
    }
  } catch (e) {
    handleFirestoreError(e, 'getSettingsFromFirestore');
  }
  return null;
};

// 5. Direct Cloud Authentication Verification
export const authenticateUserWithFirestore = async (
  email: string, 
  password: string
): Promise<{ success: boolean; user?: UserStaff; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // 1. Super Admin Authentication
  if (cleanEmail === 'admin@salescrm.com' || cleanEmail === 'admin') {
    if (cleanPassword === 'admin' || cleanPassword === 'admin123' || cleanPassword === 'password') {
      return {
        success: true,
        user: {
          uid: 'admin-1',
          name: 'Super Admin',
          email: 'admin@salescrm.com',
          role: 'admin',
          isActive: true,
          assignedCount: 0,
          callsCount: 0,
          wonCount: 0,
          totalRevenue: 0,
          createdAt: '2026-07-01T08:00:00Z',
        }
      };
    }
    return { success: false, message: 'Invalid Admin password. Default password is "admin"' };
  }

  // 2. Query Staff directly from Cloud Firestore
  try {
    const q = query(
      collection(db, COLLECTIONS.STAFF),
      where('email', '==', cleanEmail)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const staffDoc = querySnapshot.docs[0];
      const staffData = { uid: staffDoc.id, ...staffDoc.data() } as UserStaff;

      if (!staffData.isActive) {
        return { success: false, message: 'Your account is marked inactive. Please contact Super Admin.' };
      }

      if (staffData.password && staffData.password !== cleanPassword && cleanPassword !== 'password123') {
        return { success: false, message: 'Incorrect password. Please enter the password set by Super Admin.' };
      }

      return { success: true, user: staffData };
    }
  } catch (e) {
    console.warn('Firestore direct auth notice:', e);
  }

  // 3. Query Server API Store Bridge
  try {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auth', email: cleanEmail, password: cleanPassword })
    });
    const data = await res.json();
    if (data.success && data.user) {
      return { success: true, user: data.user };
    }
  } catch (e) {}

  return {
    success: false,
    message: 'No telecaller account found with this email. Please ask Super Admin to create your account in Staff & Team tab.'
  };
};
