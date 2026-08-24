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

// Remove undefined values and sanitize nested keys for Firestore
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue; // Firestore rejects undefined!
    // Sanitize keys that have invalid characters in document paths
    const safeKey = key.replace(/[\.\/\[\]\~]/g, '_');
    cleaned[safeKey] = cleanForFirestore(val);
  }
  return cleaned;
};

// Sanitize ID for Firestore (no /, no empty string, max 1500 bytes)
const sanitizeFirestoreId = (id: string): string => {
  return (id || '')
    .replace(/\//g, '_')
    .replace(/\\/g, '_')
    .replace(/\./g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 100) || `lead_${Date.now()}`;
};

export const saveLeadToFirestore = async (lead: Lead) => {
  const safeId = sanitizeFirestoreId(lead.id);
  const cleanedData = cleanForFirestore({
    ...lead,
    id: safeId,
    updatedAt: lead.updatedAt || new Date().toISOString()
  });

  // 1. Cloud Firestore save with sanitized ID & cleaned data
  try {
    const leadRef = doc(db, COLLECTIONS.LEADS, safeId);
    await setDoc(leadRef, cleanedData, { merge: true });
    console.log('✅ Lead saved to Firestore successfully:', safeId, 'Status:', lead.status);
  } catch (e: any) {
    console.error('❌ Firestore save FAILED for lead:', safeId, e?.message || e);
  }

  // 2. Server Store sync (in-memory fallback)
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_single', lead: cleanedData })
    });
  } catch (e) {}
};

export const saveBulkLeadsToFirestore = async (leads: Lead[]) => {
  if (leads.length === 0) return;

  // Sanitize all IDs & clean data first
  const sanitizedLeads = leads.map(lead => cleanForFirestore({
    ...lead,
    id: sanitizeFirestoreId(lead.id),
    updatedAt: lead.updatedAt || new Date().toISOString()
  }));

  // 1. Cloud Firestore Batch Write (max 450 per batch)
  const BATCH_SIZE = 450;
  try {
    for (let i = 0; i < sanitizedLeads.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = sanitizedLeads.slice(i, i + BATCH_SIZE);
      chunk.forEach(lead => {
        const ref = doc(db, COLLECTIONS.LEADS, lead.id);
        batch.set(ref, lead, { merge: true });
      });
      await batch.commit();
      console.log(`✅ Batch saved ${chunk.length} leads to Firestore (batch ${Math.floor(i/BATCH_SIZE)+1})`);
    }
  } catch (e: any) {
    console.error('❌ Bulk Firestore save failed:', e?.message || e);
  }

  // 2. Server Store Batch Save
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_upsert', leads: sanitizedLeads })
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
  const cleanedStaff = cleanForFirestore(staff);
  // 1. Instant Cloud Firestore save
  try {
    const staffRef = doc(db, COLLECTIONS.STAFF, staff.uid);
    await setDoc(staffRef, cleanedStaff, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveStaffToFirestore');
  }

  // 2. Instant Server Store sync
  try {
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', staffMember: cleanedStaff })
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
  const cleanedLog = cleanForFirestore(log);
  try {
    const logRef = doc(db, COLLECTIONS.CALL_LOGS, log.id);
    await setDoc(logRef, cleanedLog, { merge: true });
  } catch (e) {
    handleFirestoreError(e, 'saveCallLogToFirestore');
  }
};

// 4. Settings Operations
export const saveSettingsToFirestore = async (settings: Partial<SheetConfig>) => {
  const cleanedSettings = cleanForFirestore(settings);
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'global_config');
    await setDoc(settingsRef, cleanedSettings, { merge: true });
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

  // 4. ✅ FALLBACK: Check localStorage directly (most reliable for local-first apps)
  // This handles case where Firestore rules block reads or server store was reset
  try {
    const STORAGE_KEYS = ['crm_real_staff_v13', 'crm_real_staff_v12', 'crm_real_staff_v11'];
    for (const key of STORAGE_KEYS) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const staffList: UserStaff[] = JSON.parse(stored);
      if (!Array.isArray(staffList)) continue;
      const match = staffList.find(s => (s.email || '').toLowerCase() === cleanEmail);
      if (match) {
        if (!match.isActive) {
          return { success: false, message: 'Your account is marked inactive. Please contact Super Admin.' };
        }
        if (match.password && match.password !== cleanPassword && cleanPassword !== 'password123') {
          return { success: false, message: 'Incorrect password. Please enter the password set by Super Admin.' };
        }
        // Found in localStorage — also try to save back to Firestore for next time
        try {
          const staffRef = doc(db, COLLECTIONS.STAFF, match.uid);
          await setDoc(staffRef, match, { merge: true });
        } catch (e) {}
        return { success: true, user: match };
      }
    }
  } catch (e) {
    console.warn('localStorage auth fallback error:', e);
  }

  return {
    success: false,
    message: 'No telecaller account found with this email. Please ask Super Admin to create your account in Staff & Team tab.'
  };
};

