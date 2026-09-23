'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Lead, UserStaff, CallLog, SheetConfig, CallOutcome, LeadStatus, CRMStats } from '@/types/crm';
import { INITIAL_ADMIN, INITIAL_STAFF, INITIAL_LEADS, INITIAL_CALL_LOGS, INITIAL_SHEET_CONFIG } from '@/lib/mockData';
import { 
  subscribeToLeads, 
  subscribeToStaff, 
  subscribeToCallLogs, 
  saveLeadToFirestore, 
  saveBulkLeadsToFirestore,
  replaceAllLeadsInFirestore,
  fetchAllLeadsFromFirestore,
  fetchAllStaffFromFirestore,
  deleteLeadFromFirestore,
  saveStaffToFirestore,
  deleteStaffFromFirestore,
  saveCallLogToFirestore,
  saveSettingsToFirestore,
  getSettingsFromFirestore
} from '@/lib/firestoreService';
import confetti from 'canvas-confetti';

interface CRMContextType {
  // State
  currentUser: UserStaff;
  isAuthenticated: boolean;
  allStaff: UserStaff[];
  leads: Lead[];
  callLogs: CallLog[];
  sheetConfig: SheetConfig;
  stats: CRMStats;
  selectedLeadForCall: Lead | null;
  selectedLeadForView: Lead | null;
  isCallModalOpen: boolean;
  isLeadModalOpen: boolean;
  isAddLeadModalOpen: boolean;
  isAddStaffModalOpen: boolean;
  isSheetModalOpen: boolean;
  isAutoScanning: boolean;
  lastAutoScanTime: string | null;

  // Actions
  setCurrentUser: (user: UserStaff) => void;
  switchUserRole: (userId: string) => void;
  logout: () => void;
  login: (user: UserStaff) => void;
  
  // Lead Operations
  addLead: (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalCallsCount'>) => Lead;
  updateLeadStatus: (leadId: string, status: LeadStatus, dealValue?: number) => void;
  bulkUpdateLeadStatus: (leadIds: string[], status: LeadStatus) => void;
  assignLead: (leadId: string, staffId: string | null) => void;
  bulkAssignLeads: (leadIds: string[], staffId: string | null) => void;
  assignAllLeadsToStaff: (staffId: string, onlyUnassigned?: boolean, forceOverwriteWorkingLeads?: boolean) => { updatedCount: number; skippedCount?: number; message: string };
  distributeLeadsEquallyToAllStaff: (onlyUnassigned?: boolean, forceRebalanceAll?: boolean) => { updatedCount: number; message: string };
  restoreLeadsToOriginalCallers: () => { restoredCount: number; message: string };
  deleteLead: (leadId: string) => void;
  bulkDeleteLeads: (leadIds: string[]) => void;
  
  // Call Operations
  openCallModal: (lead: Lead) => void;
  closeCallModal: () => void;
  quickLogCall: (lead: Lead) => void; // 1-click call count increment + open dialer
  logCall: (data: {
    leadId: string;
    outcome: CallOutcome;
    durationSeconds: number;
    notes: string;
    nextFollowUpDate?: string;
    dealValue?: number;
    newStatus?: LeadStatus;
  }) => void;
  
  // Follow-up Operations
  markFollowUpDone: (leadId: string) => void;
  rescheduleFollowUp: (leadId: string, nextDate: string, notes?: string) => void;

  // Staff Operations
  addStaff: (data: { name: string; email: string; phone?: string; role: 'admin' | 'staff'; dailyLeadLimit?: number; password?: string }) => UserStaff;
  toggleStaffStatus: (staffId: string) => void;
  updateStaff: (staffId: string, data: Partial<UserStaff>) => void;
  deleteStaff: (staffId: string) => void;

  // Google Sheets Operations & Distribution Pool
  updateSheetConfig: (config: Partial<SheetConfig>) => void;
  toggleStaffDistribution: (staffId: string) => void;
  selectAllStaffForDistribution: () => void;
  syncGoogleSheet: (leadsToImport?: Partial<Lead>[]) => Promise<{ addedCount: number; message: string }>;
  cleanAndSyncDatabaseFromSheet: () => Promise<{ totalCleanLeads: number; message: string }>;
  restoreStatusesFromCallLogs: () => Promise<{ restoredCount: number; message: string }>;
  
  // UI Helpers
  openLeadDetails: (lead: Lead) => void;
  closeLeadDetails: () => void;
  setIsAddLeadModalOpen: (open: boolean) => void;
  setIsAddStaffModalOpen: (open: boolean) => void;
  setIsSheetModalOpen: (open: boolean) => void;
  resetToDemoData: () => void;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LEADS: 'crm_real_leads_v13',
  STAFF: 'crm_real_staff_v13',
  CALLS: 'crm_real_calls_v13',
  CURRENT_USER: 'crm_real_user_v13',
  SHEET_CONFIG: 'crm_real_config_v13',
  IS_AUTH: 'crm_real_auth_v13',
};

// Strict check to discard any fake/mock staff
const isLegacyMockStaff = (s: any) => {
  if (!s) return true;
  const legacyIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4'];
  const legacyEmails = ['saloni@salescrm.com', 'rahul@salescrm.com', 'amit@salescrm.com'];
  if (legacyIds.includes(s.uid)) return true;
  if (s.email && legacyEmails.includes(s.email.toLowerCase())) return true;
  if (s.name === 'Saloni Sharma' || s.name === 'Rahul Verma' || s.name === 'Amit Kumar') return true;
  return false;
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // IMPORTANT: Start as FALSE so login screen is shown first on every fresh load
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUserState] = useState<UserStaff>(INITIAL_ADMIN);
  const [rawStaff, setRawStaff] = useState<UserStaff[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(INITIAL_SHEET_CONFIG);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [lastAutoScanTime, setLastAutoScanTime] = useState<string | null>(null);

  // Modals & Active selections
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const roundRobinPointerRef = useRef(0);
  const rawStaffRef = useRef<UserStaff[]>([]);
  const sheetConfigRef = useRef<SheetConfig>(INITIAL_SHEET_CONFIG);
  const callLogsRef = useRef<CallLog[]>([]);
  // Block Firestore real-time listener from overwriting leads during Clean & Sync
  const isSyncingRef = useRef(false);
  // Track recent local edits by phone/id to prevent in-flight Firestore snapshot overrides
  const localUpdatesRef = useRef<Map<string, number>>(new Map());

  const recordLocalLeadUpdate = useCallback((leadOrId: string | { id?: string; phone?: string }) => {
    const now = Date.now();
    if (typeof leadOrId === 'string') {
      localUpdatesRef.current.set(leadOrId, now);
      const digits = leadOrId.replace(/\D/g, '');
      if (digits.length >= 10) localUpdatesRef.current.set(digits.slice(-10), now);
    } else {
      if (leadOrId.id) localUpdatesRef.current.set(leadOrId.id, now);
      if (leadOrId.phone) {
        const pKey = (leadOrId.phone || '').replace(/\D/g, '').slice(-10);
        if (pKey) localUpdatesRef.current.set(pKey, now);
      }
    }
  }, []);

  useEffect(() => {
    rawStaffRef.current = rawStaff;
  }, [rawStaff]);

  useEffect(() => {
    sheetConfigRef.current = sheetConfig;
  }, [sheetConfig]);

  useEffect(() => {
    callLogsRef.current = callLogs;
  }, [callLogs]);

  // Dynamic real staff metrics
  const allStaff = useMemo(() => {
    return rawStaff
      .filter(s => !isLegacyMockStaff(s))
      .map(staff => {
        const cleanUid = (staff.uid || '').toLowerCase();
        const cleanEmail = (staff.email || '').toLowerCase();
        const cleanName = (staff.name || '').toLowerCase();

        const assignedCount = leads.filter(l => {
          const aTo = (l.assignedTo || '').toLowerCase();
          const aName = (l.assignedToName || '').toLowerCase();
          return aTo === cleanUid || aTo === cleanEmail || aName === cleanName;
        }).length;

        const callsCount = callLogs.filter(c => c.staffId === staff.uid || c.staffName?.toLowerCase() === cleanName).length;
        const wonLeads = leads.filter(l => {
          const aTo = (l.assignedTo || '').toLowerCase();
          const aName = (l.assignedToName || '').toLowerCase();
          return (aTo === cleanUid || aTo === cleanEmail || aName === cleanName) && l.status === 'won';
        });
        const wonCount = wonLeads.length;
        const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);

        return {
          ...staff,
          assignedCount,
          callsCount,
          wonCount,
          totalRevenue
        };
      });
  }, [rawStaff, leads, callLogs]);

  // Normalize phone to last-10-digits key for deduplication
  const phoneKey = (phone: string): string => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits || phone;
  };

  // Sync / Import Google Sheet — idempotent deduplication by phone key
  const syncGoogleSheet = useCallback(async (customPayload?: Partial<Lead>[]): Promise<{ addedCount: number; message: string }> => {
    let addedCount = 0;
    const now = new Date().toISOString();

    let leadsToProcess: Partial<Lead>[] = [];

    if (customPayload && customPayload.length > 0) {
      leadsToProcess = customPayload;
    } else {
      try {
        const res = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spreadsheetId: sheetConfigRef.current.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U' })
        });
        const data = await res.json();
        if (data.success && data.leads) {
          leadsToProcess = data.leads;
        }
      } catch (err) {
        console.warn('API sync error, falling back:', err);
      }
    }

    if (leadsToProcess.length === 0) {
      return { addedCount: 0, message: 'Google Sheet checked. No new rows found.' };
    }

    // Deduplicate incoming items themselves by phone key (sheet may have duplicates)
    const seenIncoming = new Set<string>();
    leadsToProcess = leadsToProcess.filter(item => {
      if (!item.phone) return false;
      const key = phoneKey(item.phone);
      if (!key || key.length < 8) return false;
      if (seenIncoming.has(key)) return false;
      seenIncoming.add(key);
      return true;
    });

    const currentStaffList = rawStaffRef.current.filter(s => !isLegacyMockStaff(s));
    const currentConfig = sheetConfigRef.current;
    const selectedIds = currentConfig.selectedStaffIds || [];
    // Only use SELECTED pool for assignment. If selectedIds is empty, skip auto-assign.
    const activeStaffPool = selectedIds.length > 0
      ? currentStaffList.filter(s => s.isActive && s.role === 'staff' && selectedIds.includes(s.uid))
      : currentStaffList.filter(s => s.isActive && s.role === 'staff');

    let distributionIndex = 0;

    setLeads(currentLeads => {
      // Build existing map keyed by last-10-digit phone key for fuzzy matching
      const existingByPhoneKey = new Map<string, Lead>();
      const existingById = new Map<string, Lead>();
      for (const l of currentLeads) {
        existingByPhoneKey.set(phoneKey(l.phone), l);
        existingById.set(l.id, l);
      }

      const leadsToSave: Lead[] = [];
      // Start with a map so we can efficiently merge
      const resultMap = new Map<string, Lead>(currentLeads.map(l => [phoneKey(l.phone), l]));

      for (const item of leadsToProcess) {
        if (!item.phone) continue;
        const pKey = phoneKey(item.phone);

        // Use deterministic ID from sync API (lead_sheet_<phoneKey>)
        const deterministicId = item.id || `lead_sheet_${pKey}`;

        let assignedId: string | null = null;
        let assignedName: string | undefined = undefined;

        if (currentConfig.autoAssignEnabled && activeStaffPool.length > 0) {
          const staff = activeStaffPool[distributionIndex % activeStaffPool.length];
          assignedId = staff.uid;
          assignedName = staff.name;
          distributionIndex++;
        }

        const existing = existingByPhoneKey.get(pKey) || existingById.get(deterministicId);
        if (existing) {
          // Lead already exists — only update assignment if it was unassigned
          if (!existing.assignedTo && assignedId) {
            const modified: Lead = {
              ...existing,
              assignedTo: assignedId,
              assignedToName: assignedName,
              assignedAt: now,
              updatedAt: now
            };
            resultMap.set(pKey, modified);
            leadsToSave.push(modified);
          }
          // else: keep existing lead untouched (preserve call logs, status, notes)
        } else {
          // Brand new lead from sheet
          const newLead: Lead = {
            id: deterministicId,
            name: item.name || 'Client',
            phone: item.phone,
            email: item.email || '',
            source: item.source || 'Amazon Seller Lead Form',
            customFields: item.customFields || {},
            assignedTo: assignedId,
            assignedToName: assignedName,
            assignedAt: assignedId ? now : undefined,
            status: 'new',
            priority: item.priority || 'medium',
            totalCallsCount: 0,
            createdAt: item.createdAt || now,
            updatedAt: now,
          };
          resultMap.set(pKey, newLead);
          leadsToSave.push(newLead);
          addedCount++;
        }
      }

      const updatedList = Array.from(resultMap.values());

      // Save only changed/new leads to Firestore
      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
      }

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });

    setSheetConfig(prev => {
      const updated = {
        ...prev,
        lastSyncAt: now,
        totalImported: prev.totalImported + addedCount,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(updated));
      } catch (e) {}
      saveSettingsToFirestore(updated);
      return updated;
    });

    setLastAutoScanTime(now);

    return {
      addedCount,
      message: addedCount > 0
        ? `✅ ${addedCount} nayi leads add hui Google Sheet se!`
        : `✓ Sheet synced. Koi nayi lead nahi mili (sab already CRM mein hain).`
    };
  }, []);

  // 🧹 Clean and Sync Database from Google Sheet (Strict Deduplication & Purge Old Mock/Duplicates)
  // ⚠️ SAFE: Preserves all staff-set statuses, call history, assignments from Firestore
  const cleanAndSyncDatabaseFromSheet = useCallback(async (): Promise<{ totalCleanLeads: number; message: string }> => {
    const now = new Date().toISOString();
    isSyncingRef.current = true; // 🛑 Pause Firestore listener to prevent 2084 leads re-pushing
    try {
      // STEP 1: Fetch Google Sheet leads (source of truth for phone numbers & form answers)
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sheetConfigRef.current.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U' })
      });
      const data = await res.json();
      if (!data.success || !Array.isArray(data.leads)) {
        return { totalCleanLeads: leads.length, message: data.error || 'Failed to fetch Google Sheet' };
      }

      const sheetLeads: Partial<Lead>[] = data.leads;

      // STEP 2: Fetch authoritative lead data from Firestore FIRST (has all staff statuses/calls/assignments)
      // Do NOT use stale React state — always read from DB to get latest staff work
      const firestoreLeads = await fetchAllLeadsFromFirestore();

      // STEP 3: Build existingMap from Firestore leads (most trusted source)
      // Multiple phone formats are handled by last-10-digit key
      const existingMap = new Map<string, Lead>();
      firestoreLeads.forEach(l => {
        const key = phoneKey(l.phone);
        if (key) {
          const current = existingMap.get(key);
          // Keep the lead with MORE call activity or non-new status (preserves telecaller work)
          if (!current 
            || (l.totalCallsCount || 0) > (current.totalCallsCount || 0)
            || (l.status !== 'new' && current.status === 'new')
          ) {
            existingMap.set(key, l);
          }
        }
      });

      // Also include any leads from current React state not yet in Firestore
      leads.forEach(l => {
        const key = phoneKey(l.phone);
        if (key && !existingMap.has(key)) {
          existingMap.set(key, l);
        } else if (key) {
          const current = existingMap.get(key);
          if (current && (
            (l.totalCallsCount || 0) > (current.totalCallsCount || 0) ||
            (l.status !== 'new' && current.status === 'new')
          )) {
            existingMap.set(key, l);
          }
        }
      });

      const currentStaffList = rawStaffRef.current.filter(s => !isLegacyMockStaff(s));
      const currentConfig = sheetConfigRef.current;
      const selectedIds = currentConfig.selectedStaffIds || [];
      const activeStaffPool = selectedIds.length > 0
        ? currentStaffList.filter(s => s.isActive && s.role === 'staff' && selectedIds.includes(s.uid))
        : currentStaffList.filter(s => s.isActive && s.role === 'staff');

      let distIdx = 0;
      const cleanedList: Lead[] = [];
      const seenPhones = new Set<string>();
      let preservedCount = 0;
      let newCount = 0;

      for (const item of sheetLeads) {
        if (!item.phone) continue;
        const pKey = phoneKey(item.phone);
        if (!pKey || seenPhones.has(pKey)) continue;
        seenPhones.add(pKey);

        const deterministicId = `lead_sheet_${pKey}`;
        const existing = existingMap.get(pKey);

        if (existing) {
          // ✅ PRESERVE: Keep all telecaller work (status, calls, notes, assignment)
          cleanedList.push({
            ...existing,                        // All staff data: status, calls, notes, assignedTo etc.
            id: deterministicId,                // Normalize ID
            name: item.name && item.name !== 'Client' ? item.name : existing.name,
            phone: item.phone || existing.phone,
            email: item.email || existing.email || '',
            customFields: {
              ...(existing.customFields || {}),  // Keep existing custom fields
              ...(item.customFields || {}),       // Overwrite with fresh sheet answers
            },
            updatedAt: now,
          });
          preservedCount++;
        } else {
          // 🆕 BRAND NEW lead from sheet — assign to staff via round-robin
          let assignedId: string | null = null;
          let assignedName: string | undefined = undefined;
          if (currentConfig.autoAssignEnabled && activeStaffPool.length > 0) {
            const staff = activeStaffPool[distIdx % activeStaffPool.length];
            assignedId = staff.uid;
            assignedName = staff.name;
            distIdx++;
          }

          cleanedList.push({
            id: deterministicId,
            name: item.name || 'Client',
            phone: item.phone,
            email: item.email || '',
            source: item.source || 'Amazon Seller Lead Form',
            customFields: item.customFields || {},
            assignedTo: assignedId,
            assignedToName: assignedName,
            assignedAt: assignedId ? now : undefined,
            status: 'new',
            priority: item.priority || 'medium',
            totalCallsCount: 0,
            createdAt: item.createdAt || now,
            updatedAt: now,
          });
          newCount++;
        }
      }

      // STEP 4: Update local state
      setLeads(cleanedList);
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(cleanedList));
      } catch (e) {}

      // STEP 5: Save to Firestore DB and purge old orphan/duplicate documents
      await replaceAllLeadsInFirestore(cleanedList);

      setSheetConfig(prev => {
        const updated = {
          ...prev,
          lastSyncAt: now,
          totalImported: cleanedList.length,
        };
        try { localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(updated)); } catch(e){}
        saveSettingsToFirestore(updated);
        return updated;
      });

      return {
        totalCleanLeads: cleanedList.length,
        message: `✅ Sync Complete! ${cleanedList.length} real leads saved. ${preservedCount} leads ka status/calling history safe raha. ${newCount > 0 ? `${newCount} nayi leads add hui.` : ''}`
      };
    } catch (e: any) {
      return { totalCleanLeads: leads.length, message: e?.message || 'Sync error' };
    } finally {
      // ✅ Re-enable Firestore listener (with 2s delay so new clean leads settle first)
      setTimeout(() => { isSyncingRef.current = false; }, 2000);
    }
  }, [leads]);

  // 🔁 Restore Lost Statuses from Call Logs
  // Use this if a sync accidentally reset statuses to 'new'
  // It reads all call logs, maps outcome → status, and re-applies to leads that got reset
  const restoreStatusesFromCallLogs = useCallback(async (): Promise<{ restoredCount: number; message: string }> => {
    const now = new Date().toISOString();

    // 1. Build a map: leadId → best known status from call logs
    const outcomeToStatus: Record<string, string> = {
      'converted': 'won',
      'callback': 'followup',
      'connected': 'interested',
      'not_interested': 'not_interested',
      'no_answer': 'call_not_picked',
      'busy': 'call_not_picked',
      'wrong_number': 'call_not_picked',
    };

    // Group latest call log per lead (most recent call determines status)
    const latestCallByLeadId = new Map<string, { outcome: string; staffId: string; staffName: string; callCount: number; nextFollowUpDate?: string; notes?: string }>();
    const allLogs = callLogsRef.current;

    // Sort ascending by date so last entry wins
    const sorted = [...allLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    sorted.forEach(log => {
      const existing = latestCallByLeadId.get(log.leadId);
      latestCallByLeadId.set(log.leadId, {
        outcome: log.callOutcome,
        staffId: log.staffId,
        staffName: log.staffName,
        callCount: (existing?.callCount || 0) + 1,
        nextFollowUpDate: log.nextFollowUpDate || existing?.nextFollowUpDate,
        notes: log.notes || existing?.notes,
      });
    });

    // Also build a map by phone number for matching if IDs changed after sync
    const latestCallByPhone = new Map<string, typeof latestCallByLeadId extends Map<any, infer V> ? V : never>();
    sorted.forEach(log => {
      if (log.leadPhone) {
        const pKey = (log.leadPhone || '').replace(/\D/g, '').slice(-10);
        if (pKey) {
          const existing = latestCallByPhone.get(pKey);
          latestCallByPhone.set(pKey, {
            outcome: log.callOutcome,
            staffId: log.staffId,
            staffName: log.staffName,
            callCount: (existing?.callCount || 0) + 1,
            nextFollowUpDate: log.nextFollowUpDate || existing?.nextFollowUpDate,
            notes: log.notes || existing?.notes,
          });
        }
      }
    });

    // 3. Compute updated leads SYNCHRONOUSLY (outside setLeads to avoid async issues)
    let restoredCount = 0;
    const currentLeads = leads; // Use ref'd leads at time of call

    const updatedLeads = currentLeads.map(lead => {
      // Skip leads that already have a meaningful status set by staff
      if (lead.status !== 'new') return lead;

      // Try to find call log by lead ID first, then by phone
      const pKey = (lead.phone || '').replace(/\D/g, '').slice(-10);
      const callInfo = latestCallByLeadId.get(lead.id) || (pKey ? latestCallByPhone.get(pKey) : undefined);

      if (!callInfo) return lead;

      const newStatus = (outcomeToStatus[callInfo.outcome] || lead.status) as LeadStatus;
      if (newStatus === 'new') return lead; // No meaningful status to set

      restoredCount++;
      return {
        ...lead,
        status: newStatus,
        totalCallsCount: Math.max(lead.totalCallsCount || 0, callInfo.callCount),
        assignedTo: lead.assignedTo || callInfo.staffId || null,
        assignedToName: lead.assignedToName || callInfo.staffName,
        nextFollowUpDate: callInfo.nextFollowUpDate || lead.nextFollowUpDate,
        updatedAt: now,
      } as Lead;
    });

    // 4. Update React state + localStorage atomically
    setLeads(updatedLeads);
    try {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updatedLeads));
    } catch (e) {}

    // 5. Save ALL leads to Firestore (not just changed ones) — ensures cloud matches local
    // This prevents Firestore listener from pushing back stale data
    await replaceAllLeadsInFirestore(updatedLeads);

    return {
      restoredCount,
      message: restoredCount > 0
        ? `✅ ${restoredCount} leads ka status call history se restore ho gaya! Cloud bhi update hua.`
        : `ℹ️ Koi lead reset nahi mili. Sab statuses already correct hain.`
    };
  }, [leads]);

  // Initial Boot & Hydration (Runs ONCE on mount)
  useEffect(() => {
    setIsClient(true);

    // Clean legacy storage keys
    if (typeof window !== 'undefined') {
      try {
        const oldKeys = [
          'crm_clean_staff_v12',
          'crm_clean_staff_v11',
          'crm_clean_staff_v10',
          'crm_clean_staff_v9',
          'crm_permanent_staff_v7'
        ];
        oldKeys.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }

    let initialLeads: Lead[] = [];

    // 1. Read local storage
    try {
      const savedLeads = localStorage.getItem(STORAGE_KEYS.LEADS);
      const savedStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
      const savedCalls = localStorage.getItem(STORAGE_KEYS.CALLS);
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const savedConfig = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
      const savedAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTH);

      if (savedLeads) {
        const parsed = JSON.parse(savedLeads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialLeads = parsed;
          setLeads(parsed);
        }
      }

      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (Array.isArray(parsed)) {
          const cleanStaff = parsed.filter(s => !isLegacyMockStaff(s));
          setRawStaff(cleanStaff);
        }
      }

      if (savedCalls) {
        const parsed = JSON.parse(savedCalls);
        if (Array.isArray(parsed)) {
          setCallLogs(parsed);
        }
      }

      if (savedUser) setCurrentUserState(JSON.parse(savedUser));
      if (savedConfig) setSheetConfig(JSON.parse(savedConfig));

      // Only restore auth session if explicitly saved as true
      // This prevents auto-admin-login on fresh/cleared browser
      if (savedAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        // Always show login screen on fresh/cleared state
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn('Storage read warning:', e);
    }

    setIsInitialized(true);

    // 2. Fetch clean staff from DB - merge with localStorage staff, don't overwrite if DB is empty
    fetchAllStaffFromFirestore().then(staffFromDb => {
      if (staffFromDb && Array.isArray(staffFromDb) && staffFromDb.length > 0) {
        const clean = staffFromDb.filter(s => !isLegacyMockStaff(s));
        if (clean.length > 0) {
          setRawStaff(clean);
          try { localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(clean)); } catch(e){}
        }
      }
    });

    // 3. Load leads from Firestore (cloud) — smart dedup: pick best-status lead per phone
    fetchAllLeadsFromFirestore().then(leadsFromDb => {
      if (leadsFromDb && leadsFromDb.length > 0) {
        // Deduplicate by phone key — keep highest-priority status lead
        const priorityMap: Record<string, number> = {
          won: 7, interested: 6, followup: 5, contacted: 4,
          call_not_picked: 3, not_interested: 2, new: 1
        };
        const byPhone = new Map<string, Lead>();
        leadsFromDb.forEach(lead => {
          const pKey = (lead.phone || '').replace(/\D/g, '').slice(-10);
          if (!pKey || pKey.length < 8) return;
          const existing = byPhone.get(pKey);
          if (!existing) {
            byPhone.set(pKey, lead);
          } else {
            const newP = priorityMap[lead.status] || 1;
            const curP = priorityMap[existing.status] || 1;
            if (newP > curP || (newP === curP && (lead.totalCallsCount || 0) > (existing.totalCallsCount || 0))) {
              byPhone.set(pKey, lead);
            }
          }
        });
        const deduped = Array.from(byPhone.values());
        setLeads(deduped);
        try { localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(deduped)); } catch(e){}
      }
      // NOTE: syncGoogleSheet() removed from boot — use "Clean & Sync" button manually
    });

    // 4. Subscribe to Firestore real-time updates
    // ⚠️ Robust Multi-Attribute Matching & Smart Merge:
    // Matches by Phone, Name, and ID; preserves staff edits, questions/answers, and timestamps.
    const statusPriority: Record<string, number> = {
      won: 7, interested: 6, followup: 5, contacted: 4,
      call_not_picked: 3, not_interested: 2, new: 1
    };

    const getPhoneKey = (phone: string) => {
      const digits = (phone || '').replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    const normalizeName = (name: string) => {
      return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    };

    const smartMergeLeads = (incoming: Lead[], currentState: Lead[]): Lead[] => {
      // Step 1: Deduplicate incoming Firestore snapshot by Phone & Name
      const incomingDedupedMap = new Map<string, Lead>();
      
      incoming.forEach(lead => {
        const pKey = getPhoneKey(lead.phone);
        const nName = normalizeName(lead.name);
        const matchKey = pKey && pKey.length >= 8 ? `p_${pKey}` : (nName ? `n_${nName}` : `id_${lead.id}`);
        
        const existing = incomingDedupedMap.get(matchKey);
        if (!existing) {
          incomingDedupedMap.set(matchKey, lead);
        } else {
          // Merge duplicates: pick best status, merge custom fields, max calls
          const incP = statusPriority[lead.status] || 1;
          const curP = statusPriority[existing.status] || 1;
          const chooseIncoming = incP > curP || 
            (incP === curP && (lead.totalCallsCount || 0) > (existing.totalCallsCount || 0)) ||
            (incP === curP && new Date(lead.updatedAt || 0).getTime() > new Date(existing.updatedAt || 0).getTime());

          const base = chooseIncoming ? lead : existing;
          const other = chooseIncoming ? existing : lead;

          incomingDedupedMap.set(matchKey, {
            ...base,
            id: lead.id?.startsWith('lead_sheet_') ? lead.id : (existing.id?.startsWith('lead_sheet_') ? existing.id : base.id),
            name: (base.name && base.name !== 'Client' && !/^Lead #/i.test(base.name)) ? base.name : other.name,
            totalCallsCount: Math.max(base.totalCallsCount || 0, other.totalCallsCount || 0),
            assignedTo: base.assignedTo || other.assignedTo || null,
            assignedToName: base.assignedToName || other.assignedToName,
            customFields: { ...(other.customFields || {}), ...(base.customFields || {}) },
            nextFollowUpDate: base.nextFollowUpDate || other.nextFollowUpDate,
            dealValue: base.dealValue || other.dealValue,
            updatedAt: new Date(Math.max(new Date(base.updatedAt || 0).getTime(), new Date(other.updatedAt || 0).getTime())).toISOString()
          });
        }
      });

      // Step 2: Index current local state by Phone, Name, and ID
      const currentByPhone = new Map<string, Lead>();
      const currentByName = new Map<string, Lead>();
      const currentById = new Map<string, Lead>();

      currentState.forEach(lead => {
        if (lead.id) currentById.set(lead.id, lead);
        const pKey = getPhoneKey(lead.phone);
        if (pKey && pKey.length >= 8) currentByPhone.set(pKey, lead);
        const nName = normalizeName(lead.name);
        if (nName && nName !== 'client' && !nName.startsWith('lead')) currentByName.set(nName, lead);
      });

      // Step 3: Merge incoming with currentState
      const mergedList: Lead[] = [];
      const matchedCurrentIds = new Set<string>();

      incomingDedupedMap.forEach((incomingLead) => {
        const pKey = getPhoneKey(incomingLead.phone);
        const nName = normalizeName(incomingLead.name);
        
        // Multi-point match: Phone -> ID -> Name
        const existingLead = (pKey && pKey.length >= 8 ? currentByPhone.get(pKey) : null) ||
          currentById.get(incomingLead.id) ||
          (nName && nName !== 'client' ? currentByName.get(nName) : null);

        if (!existingLead) {
          mergedList.push(incomingLead);
          return;
        }

        matchedCurrentIds.add(existingLead.id);

        // Check if lead was recently updated locally by the user (within 8 seconds)
        const lastLocalUpdate = Math.max(
          localUpdatesRef.current.get(existingLead.id) || 0,
          pKey ? (localUpdatesRef.current.get(pKey) || 0) : 0
        );
        const isLocallyProtected = Date.now() - lastLocalUpdate < 8000;

        // Resolve Status:
        // 1. If protected by user's recent click, keep local status
        // 2. If one is 'new' and the other is worked (call_not_picked, interested, won, etc.), KEEP worked status!
        // 3. If both are worked, the one with newer updatedAt wins (or won wins)
        let resolvedStatus = incomingLead.status;
        if (isLocallyProtected) {
          resolvedStatus = existingLead.status;
        } else if (incomingLead.status === 'new' && existingLead.status !== 'new') {
          resolvedStatus = existingLead.status;
        } else if (existingLead.status === 'new' && incomingLead.status !== 'new') {
          resolvedStatus = incomingLead.status;
        } else if (incomingLead.status === 'won' || existingLead.status === 'won') {
          resolvedStatus = 'won';
        } else {
          const incTime = new Date(incomingLead.updatedAt || 0).getTime();
          const curTime = new Date(existingLead.updatedAt || 0).getTime();
          resolvedStatus = curTime > incTime ? existingLead.status : incomingLead.status;
        }

        // Real Name
        let resolvedName = incomingLead.name;
        if ((!resolvedName || resolvedName === 'Client' || /^Lead #/i.test(resolvedName)) && existingLead.name && existingLead.name !== 'Client') {
          resolvedName = existingLead.name;
        }

        // Custom Fields Q&A merge (ensure questions like GST, Amazon A/C, Timeline are never wiped)
        const mergedCustomFields = {
          ...(existingLead.customFields || {}),
          ...(incomingLead.customFields || {})
        };

        const resolvedCalls = Math.max(incomingLead.totalCallsCount || 0, existingLead.totalCallsCount || 0);
        const resolvedAssignedTo = isLocallyProtected 
          ? existingLead.assignedTo 
          : (incomingLead.assignedTo || existingLead.assignedTo || null);
        const resolvedAssignedName = isLocallyProtected 
          ? existingLead.assignedToName 
          : (incomingLead.assignedToName || existingLead.assignedToName);

        const resolvedUpdatedAt = new Date(
          Math.max(
            new Date(incomingLead.updatedAt || 0).getTime(),
            new Date(existingLead.updatedAt || 0).getTime()
          )
        ).toISOString();

        mergedList.push({
          ...incomingLead,
          id: incomingLead.id || existingLead.id,
          name: resolvedName || 'Client',
          phone: incomingLead.phone || existingLead.phone,
          email: incomingLead.email || existingLead.email || '',
          status: resolvedStatus,
          dealValue: isLocallyProtected ? existingLead.dealValue : (incomingLead.dealValue ?? existingLead.dealValue),
          totalCallsCount: resolvedCalls,
          assignedTo: resolvedAssignedTo,
          assignedToName: resolvedAssignedName,
          customFields: mergedCustomFields,
          nextFollowUpDate: incomingLead.nextFollowUpDate || existingLead.nextFollowUpDate,
          followUpNotes: incomingLead.followUpNotes || existingLead.followUpNotes,
          lastCallAt: incomingLead.lastCallAt || existingLead.lastCallAt,
          lastCallOutcome: incomingLead.lastCallOutcome || existingLead.lastCallOutcome,
          lastCallNotes: incomingLead.lastCallNotes || existingLead.lastCallNotes,
          updatedAt: resolvedUpdatedAt
        });
      });

      // Step 4: Retain any current leads not in incoming snapshot (e.g. offline/just added)
      currentState.forEach(lead => {
        if (!matchedCurrentIds.has(lead.id)) {
          const pKey = getPhoneKey(lead.phone);
          const alreadyIncluded = mergedList.some(m => m.id === lead.id || (pKey && getPhoneKey(m.phone) === pKey));
          if (!alreadyIncluded) {
            mergedList.push(lead);
          }
        }
      });

      return mergedList;
    };

    const unsubLeads = subscribeToLeads((firestoreLeads) => {
      if (isSyncingRef.current) return; // Sync in progress — ignore Firestore push
      if (!firestoreLeads || firestoreLeads.length === 0) return;

      setLeads(currentState => {
        const merged = smartMergeLeads(firestoreLeads, currentState);
        // Only update localStorage if leads actually changed (avoid infinite loops)
        const mergedCount = merged.length;
        const currentCount = currentState.length;
        if (mergedCount !== currentCount || JSON.stringify(merged.map(l => l.id + l.status).sort()) !== JSON.stringify(currentState.map(l => l.id + l.status).sort())) {
          try {
            localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(merged));
          } catch (e) {}
        }
        return merged;
      });
    });

    const unsubStaff = subscribeToStaff((firestoreStaff) => {
      if (firestoreStaff && Array.isArray(firestoreStaff)) {
        const clean = firestoreStaff.filter(s => !isLegacyMockStaff(s));
        // ONLY update staff if Firestore returned real staff - never overwrite with empty list
        if (clean.length > 0) {
          setRawStaff(clean);
          try {
            localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(clean));
          } catch (e) {}
        }
      }
    });

    const unsubCalls = subscribeToCallLogs((firestoreCalls) => {
      if (firestoreCalls && firestoreCalls.length > 0) {
        setCallLogs(firestoreCalls);
        try {
          localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(firestoreCalls));
        } catch (e) {}
      }
    });

    return () => {
      unsubLeads();
      unsubStaff();
      unsubCalls();
    };
  }, [syncGoogleSheet]);

  // Persist State to Local Storage on every change
  useEffect(() => {
    if (!isInitialized || !isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(sheetConfig));
      const cleanStaff = rawStaff.filter(s => !isLegacyMockStaff(s));
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cleanStaff));
      localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(callLogs));
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, JSON.stringify(isAuthenticated));
      if (leads.length > 0) {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
      }
    } catch (e) {
      console.warn('Storage save warning:', e);
    }
  }, [leads, rawStaff, callLogs, currentUser, sheetConfig, isAuthenticated, isClient, isInitialized]);

  // Auth Operations
  const login = (user: UserStaff) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    // Explicitly clear auth from localStorage so login screen shows on next visit/refresh
    try {
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'false');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e) {}
  };

  const setCurrentUser = (user: UserStaff) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
  };

  const switchUserRole = (userId: string) => {
    if (userId === INITIAL_ADMIN.uid) {
      setCurrentUserState(INITIAL_ADMIN);
      return;
    }
    const target = allStaff.find(s => s.uid === userId);
    if (target) {
      setCurrentUserState(target);
    }
  };

  // Add Single Lead
  const addLead = useCallback((leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalCallsCount'>): Lead => {
    const now = new Date().toISOString();
    let assignedStaffId = leadData.assignedTo;
    let assignedStaffName = leadData.assignedToName;

    if (!assignedStaffId && sheetConfigRef.current.autoAssignEnabled) {
      const selectedIds = sheetConfigRef.current.selectedStaffIds || [];
      const currentStaffList = rawStaffRef.current.filter(s => !isLegacyMockStaff(s));
      const pool = currentStaffList.filter(s => s.isActive && s.role === 'staff' && (selectedIds.length === 0 || selectedIds.includes(s.uid)));
      const activeStaffPool = pool.length > 0 ? pool : currentStaffList.filter(s => s.isActive && s.role === 'staff');

      if (activeStaffPool.length > 0) {
        const nextStaff = activeStaffPool[roundRobinPointerRef.current % activeStaffPool.length];
        roundRobinPointerRef.current++;
        assignedStaffId = nextStaff.uid;
        assignedStaffName = nextStaff.name;
      }
    }

    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      assignedTo: assignedStaffId || null,
      assignedToName: assignedStaffName || undefined,
      assignedAt: assignedStaffId ? now : undefined,
      totalCallsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setLeads(prev => {
      const updated = [newLead, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    saveLeadToFirestore(newLead);
    return newLead;
  }, []);

  // Update Lead Status
  const updateLeadStatus = useCallback((leadId: string, status: LeadStatus, dealValue?: number) => {
    const now = new Date().toISOString();

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const modified: Lead = {
          ...lead,
          status,
          dealValue: dealValue !== undefined ? dealValue : lead.dealValue,
          updatedAt: now,
        };
        recordLocalLeadUpdate(modified);
        saveLeadToFirestore(modified);
        return modified;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    if (status === 'won') {
      confetti({
        particleCount: 130,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [recordLocalLeadUpdate]);

  // Bulk Status Update
  const bulkUpdateLeadStatus = useCallback((leadIds: string[], status: LeadStatus) => {
    const now = new Date().toISOString();
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (!leadIds.includes(lead.id)) return lead;
        const modified: Lead = {
          ...lead,
          status,
          updatedAt: now,
        };
        recordLocalLeadUpdate(modified);
        saveLeadToFirestore(modified);
        return modified;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, [recordLocalLeadUpdate]);

  // Reassign Lead
  const assignLead = useCallback((leadId: string, staffId: string | null) => {
    const staff = rawStaffRef.current.find(s => s.uid === staffId || s.email.toLowerCase() === (staffId || '').toLowerCase());
    const now = new Date().toISOString();

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const modified: Lead = {
          ...lead,
          assignedTo: staffId,
          assignedToName: staff ? staff.name : undefined,
          assignedAt: staffId ? now : undefined,
          updatedAt: now
        };
        recordLocalLeadUpdate(modified);
        saveLeadToFirestore(modified);
        return modified;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, [recordLocalLeadUpdate]);

  // Bulk Assign Leads
  const bulkAssignLeads = useCallback((leadIds: string[], staffId: string | null) => {
    const staff = rawStaffRef.current.find(s => s.uid === staffId || s.email.toLowerCase() === (staffId || '').toLowerCase());
    const now = new Date().toISOString();

    setLeads(prev => {
      const leadsToSave: Lead[] = [];
      const updated = prev.map(lead => {
        if (!leadIds.includes(lead.id)) return lead;
        const modified: Lead = {
          ...lead,
          assignedTo: staff ? staff.uid : staffId,
          assignedToName: staff ? staff.name : undefined,
          assignedAt: staffId ? now : undefined,
          updatedAt: now
        };
        recordLocalLeadUpdate(modified);
        leadsToSave.push(modified);
        return modified;
      });

      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
      }

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, []);

  // ⚡ Safe Bulk Assign Leads to One Staff Member (Defaults to unassigned & untouched leads only)
  const assignAllLeadsToStaff = useCallback((
    staffId: string, 
    onlyUnassigned = true,
    forceOverwriteWorkingLeads = false
  ): { updatedCount: number; skippedCount: number; message: string } => {
    const cleanId = (staffId || '').toLowerCase();
    const staff = rawStaffRef.current.find(s => 
      s.uid.toLowerCase() === cleanId || 
      s.email.toLowerCase() === cleanId ||
      s.name.toLowerCase() === cleanId
    ) || (rawStaffRef.current.length > 0 ? rawStaffRef.current[0] : null);

    if (!staff) {
      return { updatedCount: 0, skippedCount: 0, message: 'Please select a valid staff member.' };
    }
    const now = new Date().toISOString();
    let updatedCount = 0;
    let skippedCount = 0;
    const leadsToSave: Lead[] = [];

    setLeads(prev => {
      const updated = prev.map(lead => {
        const hasCallHistory = (lead.totalCallsCount || 0) > 0 || callLogsRef.current.some(c => c.leadId === lead.id);
        const isAlreadyAssigned = Boolean(lead.assignedTo && lead.assignedTo.trim() !== '' && lead.assignedTo.toLowerCase() !== 'unassigned');
        const isWorkingLead = lead.status !== 'new' || hasCallHistory;

        // If safe mode (not forced), protect leads that belong to other staff or have active progress/calls
        if (!forceOverwriteWorkingLeads) {
          if (onlyUnassigned && isAlreadyAssigned && lead.assignedTo !== staff.uid) {
            skippedCount++;
            return lead;
          }
          if (isWorkingLead && isAlreadyAssigned && lead.assignedTo !== staff.uid) {
            skippedCount++;
            return lead;
          }
        }

        updatedCount++;
        const modified: Lead = {
          ...lead,
          assignedTo: staff.uid,
          assignedToName: staff.name,
          assignedAt: now,
          updatedAt: now
        };
        leadsToSave.push(modified);
        return modified;
      });

      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
      }

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    const message = skippedCount > 0
      ? `✅ Assigned ${updatedCount} leads to ${staff.name} (${skippedCount} active/called leads were protected).`
      : `✅ Successfully assigned ${updatedCount} leads to ${staff.name}!`;

    return {
      updatedCount,
      skippedCount,
      message
    };
  }, []);

  // ⚡ 100% Equal Round-Robin Distribution Across All Active Telecallers
  const distributeLeadsEquallyToAllStaff = useCallback((
    onlyUnassigned = true,
    forceRebalanceAll = false
  ): { updatedCount: number; message: string } => {
    const currentStaffList = rawStaffRef.current.filter(s => !isLegacyMockStaff(s) && s.role === 'staff' && s.isActive);
    
    if (currentStaffList.length === 0) {
      return { updatedCount: 0, message: 'Koi active telecaller nahi mila. Pehle Staff & Team me telecaller ko Active karein.' };
    }

    const now = new Date().toISOString();
    let updatedCount = 0;
    let distIdx = 0;
    const leadsToSave: Lead[] = [];

    setLeads(prev => {
      const updated = prev.map(lead => {
        const isAlreadyAssigned = Boolean(lead.assignedTo && lead.assignedTo.trim() !== '' && lead.assignedTo.toLowerCase() !== 'unassigned');
        const hasCallHistory = (lead.totalCallsCount || 0) > 0 || callLogsRef.current.some(c => c.leadId === lead.id);

        if (!forceRebalanceAll) {
          if (onlyUnassigned && isAlreadyAssigned) return lead;
          if (hasCallHistory && isAlreadyAssigned) return lead;
        }

        const assignedStaff = currentStaffList[distIdx % currentStaffList.length];
        distIdx++;
        updatedCount++;

        const modified: Lead = {
          ...lead,
          assignedTo: assignedStaff.uid,
          assignedToName: assignedStaff.name,
          assignedAt: now,
          updatedAt: now
        };
        leadsToSave.push(modified);
        return modified;
      });

      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
      }
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const staffNames = currentStaffList.map(s => s.name).join(', ');
    const message = `✅ ${updatedCount} leads barabar (Equal Round-Robin) distribute ho gayi hain: ${staffNames} ke beech!`;

    return { updatedCount, message };
  }, []);

  // 🛠️ Auto-Fix: Restore Leads back to original callers based on Call History logs
  const restoreLeadsToOriginalCallers = useCallback((): { restoredCount: number; message: string } => {
    const now = new Date().toISOString();
    let restoredCount = 0;
    const staffBreakdown: Record<string, number> = {};
    const leadsToSave: Lead[] = [];

    setLeads(prev => {
      const updated = prev.map(lead => {
        const leadCalls = callLogsRef.current.filter(c => c.leadId === lead.id);
        if (leadCalls.length === 0) return lead;

        // Sort by timestamp descending to get the most recent caller
        const sorted = [...leadCalls].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastCall = sorted[0];

        const matchedStaff = rawStaffRef.current.find(s => 
          s.uid === lastCall.staffId || 
          (s.name && lastCall.staffName && s.name.trim().toLowerCase() === lastCall.staffName.trim().toLowerCase())
        );

        const targetUid = matchedStaff ? matchedStaff.uid : lastCall.staffId;
        const targetName = matchedStaff ? matchedStaff.name : (lastCall.staffName || 'Telecaller');

        // If lead is already assigned to this caller, no action needed
        if (lead.assignedTo === targetUid) return lead;

        restoredCount++;
        staffBreakdown[targetName] = (staffBreakdown[targetName] || 0) + 1;

        const modified: Lead = {
          ...lead,
          assignedTo: targetUid,
          assignedToName: targetName,
          updatedAt: now
        };
        leadsToSave.push(modified);
        return modified;
      });

      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
      }

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    const breakdownText = Object.entries(staffBreakdown)
      .map(([name, count]) => `${count} leads back to ${name}`)
      .join(', ');

    const message = restoredCount > 0
      ? `🎉 Fixed! Restored ${restoredCount} leads to original telecallers (${breakdownText}).`
      : `ℹ️ All leads with call history are already assigned to their original callers.`;

    return { restoredCount, message };
  }, []);

  // Delete Lead
  const deleteLead = useCallback((leadId: string) => {
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== leadId);
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    deleteLeadFromFirestore(leadId);
    if (selectedLeadForView?.id === leadId) setSelectedLeadForView(null);
    if (selectedLeadForCall?.id === leadId) setIsCallModalOpen(false);
  }, [selectedLeadForView, selectedLeadForCall]);

  const bulkDeleteLeads = useCallback((leadIds: string[]) => {
    setLeads(prev => {
      const updated = prev.filter(l => !leadIds.includes(l.id));
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    leadIds.forEach(id => deleteLeadFromFirestore(id));
  }, []);

  // Open Call Modal
  const openCallModal = (lead: Lead) => {
    setSelectedLeadForCall(lead);
    setIsCallModalOpen(true);
  };

  const closeCallModal = () => {
    setIsCallModalOpen(false);
    setSelectedLeadForCall(null);
  };

  // Log a Call & Save Record Permanently in DB
  // Quick 1-click call: opens dialer + silently increments count (no modal)
  const quickLogCall = useCallback((lead: Lead) => {
    const now = new Date().toISOString();
    const callNumber = (lead.totalCallsCount || 0) + 1;

    // Open phone dialer
    window.open(`tel:${lead.phone}`, '_self');

    const newLog: CallLog = {
      id: `call-${Date.now()}`,
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone,
      staffId: currentUser.uid,
      staffName: currentUser.name,
      callNumber,
      callOutcome: 'connected',
      durationSeconds: 0,
      notes: `Call #${callNumber} dialed`,
      createdAt: now,
    };

    setCallLogs(prev => {
      const updated = [newLog, ...prev];
      try { localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    saveCallLogToFirestore(newLog);

    // Update lead: increment count, set status to contacted if new
    const statusToSet: LeadStatus =
      lead.status === 'new' ? 'contacted' : lead.status;

    const updatedLead: Lead = {
      ...lead,
      assignedTo: lead.assignedTo || currentUser.uid,
      assignedToName: lead.assignedToName || currentUser.name,
      assignedAt: lead.assignedAt || now,
      totalCallsCount: callNumber,
      lastCallAt: now,
      lastCallOutcome: 'connected',
      lastCallNotes: `Call #${callNumber} dialed`,
      status: statusToSet,
      updatedAt: now,
    };

    recordLocalLeadUpdate(updatedLead);
    setLeads(prev => {
      const updated = prev.map(l => l.id === lead.id ? updatedLead : l);
      try { localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    saveLeadToFirestore(updatedLead);
  }, [currentUser, recordLocalLeadUpdate]);

  const logCall = useCallback((data: {
    leadId: string;
    outcome: CallOutcome;
    durationSeconds: number;
    notes: string;
    nextFollowUpDate?: string;
    dealValue?: number;
    newStatus?: LeadStatus;
  }) => {
    const now = new Date().toISOString();
    const targetLead = leads.find(l => l.id === data.leadId);
    if (!targetLead) return;

    const callNumber = (targetLead.totalCallsCount || 0) + 1;

    const newLog: CallLog = {
      id: `call-${Date.now()}`,
      leadId: targetLead.id,
      leadName: targetLead.name,
      leadPhone: targetLead.phone,
      staffId: currentUser.uid,
      staffName: currentUser.name,
      callNumber,
      callOutcome: data.outcome,
      durationSeconds: data.durationSeconds,
      notes: data.notes,
      nextFollowUpDate: data.nextFollowUpDate,
      createdAt: now,
    };

    setCallLogs(prev => {
      const updated = [newLog, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    saveCallLogToFirestore(newLog);

    let statusToSet: LeadStatus = data.newStatus || targetLead.status;
    if (!data.newStatus) {
      if (data.outcome === 'converted') statusToSet = 'won';
      else if (data.outcome === 'callback') statusToSet = 'followup';
      else if (data.outcome === 'connected') statusToSet = 'interested';
      else if (data.outcome === 'not_interested') statusToSet = 'not_interested';
      else if (data.outcome === 'no_answer' || data.outcome === 'busy') statusToSet = 'call_not_picked';
      else if (targetLead.status === 'new') statusToSet = 'contacted';
    }

    const updatedLead: Lead = {
      ...targetLead,
      assignedTo: targetLead.assignedTo || currentUser.uid,
      assignedToName: targetLead.assignedToName || currentUser.name,
      assignedAt: targetLead.assignedAt || now,
      totalCallsCount: callNumber,
      lastCallAt: now,
      lastCallOutcome: data.outcome,
      lastCallNotes: data.notes,
      status: statusToSet,
      dealValue: data.dealValue !== undefined ? data.dealValue : targetLead.dealValue,
      nextFollowUpDate: data.nextFollowUpDate || (data.outcome === 'converted' ? undefined : targetLead.nextFollowUpDate),
      followUpNotes: data.nextFollowUpDate ? data.notes : targetLead.followUpNotes,
      isFollowUpDone: data.nextFollowUpDate ? false : targetLead.isFollowUpDone,
      updatedAt: now,
    };

    recordLocalLeadUpdate(updatedLead);
    setLeads(prev => {
      const updated = prev.map(l => l.id === data.leadId ? updatedLead : l);
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    saveLeadToFirestore(updatedLead);

    if (data.outcome === 'converted') {
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.5 }
      });
    }

    closeCallModal();
  }, [leads, currentUser, recordLocalLeadUpdate]);

  // Mark Follow-up Done
  const markFollowUpDone = useCallback((leadId: string) => {
    const now = new Date().toISOString();
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const modified = { ...lead, isFollowUpDone: true, updatedAt: now };
        recordLocalLeadUpdate(modified);
        saveLeadToFirestore(modified);
        return modified;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [recordLocalLeadUpdate]);

  // Reschedule Follow-up
  const rescheduleFollowUp = useCallback((leadId: string, nextDate: string, notes?: string) => {
    const now = new Date().toISOString();
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const modified: Lead = {
          ...lead,
          nextFollowUpDate: nextDate,
          followUpNotes: notes || lead.followUpNotes,
          isFollowUpDone: false,
          status: 'followup',
          updatedAt: now
        };
        recordLocalLeadUpdate(modified);
        saveLeadToFirestore(modified);
        return modified;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [recordLocalLeadUpdate]);

  // Staff Operations
  const addStaff = useCallback((data: { name: string; email: string; phone?: string; role: 'admin' | 'staff'; dailyLeadLimit?: number; password?: string }): UserStaff => {
    const newStaff: UserStaff = {
      uid: `staff-${Date.now()}`,
      name: data.name,
      email: data.email,
      password: data.password || 'password123',
      phone: data.phone || '+91 90000 00000',
      role: data.role,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,
      isActive: true,
      dailyLeadLimit: data.dailyLeadLimit || 25,
      assignedCount: 0,
      callsCount: 0,
      wonCount: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
    };

    setRawStaff(prev => {
      const updated = [...prev.filter(s => !isLegacyMockStaff(s)), newStaff];
      try {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Save to Firestore DB immediately
    saveStaffToFirestore(newStaff);

    // Auto-enable this staff in lead distribution pool & turn on auto-assign
    setSheetConfig(prev => {
      const updated = {
        ...prev,
        autoAssignEnabled: true,
        selectedStaffIds: [...new Set([...(prev.selectedStaffIds || []), newStaff.uid])]
      };
      saveSettingsToFirestore(updated);
      return updated;
    });

    // Auto-assign currently unassigned leads equally across all active staff (including new telecaller)
    const now = new Date().toISOString();
    setLeads(prev => {
      const activePool = [...rawStaffRef.current.filter(s => !isLegacyMockStaff(s) && s.role === 'staff' && s.isActive), newStaff];
      const uniquePool = Array.from(new Map(activePool.map(s => [s.uid, s])).values());
      
      let distIdx = 0;
      const leadsToSave: Lead[] = [];
      const updated = prev.map(lead => {
        if (lead.assignedTo && lead.assignedTo.trim() !== '' && lead.assignedTo.toLowerCase() !== 'unassigned') return lead;
        
        const targetStaff = uniquePool.length > 0 ? uniquePool[distIdx % uniquePool.length] : newStaff;
        distIdx++;

        const modified: Lead = {
          ...lead,
          assignedTo: targetStaff.uid,
          assignedToName: targetStaff.name,
          assignedAt: now,
          updatedAt: now
        };
        leadsToSave.push(modified);
        return modified;
      });
      if (leadsToSave.length > 0) {
        saveBulkLeadsToFirestore(leadsToSave);
        try { localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated)); } catch(e) {}
      }
      return updated;
    });

    return newStaff;
  }, []);

  const toggleStaffStatus = useCallback((staffId: string) => {
    setRawStaff(prev => {
      const updated = prev.map(s => s.uid === staffId ? { ...s, isActive: !s.isActive } : s);
      try {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const updateStaff = useCallback((staffId: string, data: Partial<UserStaff>) => {
    setRawStaff(prev => {
      const updated = prev.map(s => s.uid === staffId ? { ...s, ...data } : s);
      try {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const deleteStaff = useCallback((staffId: string) => {
    setRawStaff(prev => {
      const updated = prev.filter(s => s.uid !== staffId);
      try {
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    deleteStaffFromFirestore(staffId);
    setSheetConfig(prev => ({
      ...prev,
      selectedStaffIds: (prev.selectedStaffIds || []).filter(id => id !== staffId)
    }));
  }, []);

  const toggleStaffDistribution = useCallback((staffId: string) => {
    setSheetConfig(prev => {
      const current = prev.selectedStaffIds || [];
      const exists = current.includes(staffId);
      const updated = exists 
        ? current.filter(id => id !== staffId)
        : [...current, staffId];
      return { ...prev, selectedStaffIds: updated };
    });
  }, []);

  const selectAllStaffForDistribution = useCallback(() => {
    const allStaffIds = rawStaffRef.current.filter(s => s.role === 'staff' && !isLegacyMockStaff(s)).map(s => s.uid);
    setSheetConfig(prev => ({
      ...prev,
      selectedStaffIds: allStaffIds
    }));
  }, []);

  const updateSheetConfig = useCallback((config: Partial<SheetConfig>) => {
    setSheetConfig(prev => {
      const updated = { ...prev, ...config };
      saveSettingsToFirestore(updated);
      return updated;
    });
  }, []);

  // 3-Minute Auto-Scan Background Timer
  useEffect(() => {
    if (!sheetConfig.autoScanIntervalMinutes || sheetConfig.autoScanIntervalMinutes <= 0) return;

    const intervalMs = sheetConfig.autoScanIntervalMinutes * 60 * 1000;

    const timer = setInterval(async () => {
      setIsAutoScanning(true);
      try {
        await syncGoogleSheet();
      } catch (e) {
        console.warn('Auto-scan background poll notice:', e);
      } finally {
        setIsAutoScanning(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sheetConfig.autoScanIntervalMinutes, syncGoogleSheet]);

  // Lead Details Modal handlers
  const openLeadDetails = (lead: Lead) => {
    setSelectedLeadForView(lead);
    setIsLeadModalOpen(true);
  };

  const closeLeadDetails = () => {
    setIsLeadModalOpen(false);
    setSelectedLeadForView(null);
  };

  // Reset Data to Clean Real Sheet Sync
  const resetToDemoData = () => {
    setLeads([]);
    setRawStaff([]);
    setCallLogs([]);
    setCurrentUserState(INITIAL_ADMIN);
    setSheetConfig(INITIAL_SHEET_CONFIG);
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    syncGoogleSheet();
  };

  // Calculated Statistics
  const todayStr = new Date().toISOString().split('T')[0];

  const totalLeads = leads.length;
  const newLeadsToday = leads.filter(l => l.createdAt.startsWith(todayStr) || l.status === 'new').length;
  const callsToday = callLogs.filter(c => c.createdAt.startsWith(todayStr)).length;
  
  const followUpsPendingToday = leads.filter(l => {
    if (l.isFollowUpDone || !l.nextFollowUpDate) return false;
    const fDate = l.nextFollowUpDate.split('T')[0];
    return fDate <= todayStr;
  }).length;

  const wonLeads = leads.filter(l => l.status === 'won');
  const totalSalesWon = wonLeads.length;
  const totalRevenue = wonLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((totalSalesWon / totalLeads) * 100) : 0;

  const stats: CRMStats = {
    totalLeads,
    newLeadsToday,
    callsToday,
    followUpsPendingToday,
    totalSalesWon,
    totalRevenue,
    conversionRate,
  };

  return (
    <CRMContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        allStaff,
        leads,
        callLogs,
        sheetConfig,
        stats,
        selectedLeadForCall,
        selectedLeadForView,
        isCallModalOpen,
        isLeadModalOpen,
        isAddLeadModalOpen,
        isAddStaffModalOpen,
        isSheetModalOpen,
        isAutoScanning,
        lastAutoScanTime,
        setCurrentUser,
        switchUserRole,
        login,
        logout,
        addLead,
        updateLeadStatus,
        bulkUpdateLeadStatus,
        assignLead,
        bulkAssignLeads,
        assignAllLeadsToStaff,
        distributeLeadsEquallyToAllStaff,
        restoreLeadsToOriginalCallers,
        deleteLead,
        bulkDeleteLeads,
        openCallModal,
        closeCallModal,
        quickLogCall,
        logCall,
        markFollowUpDone,
        rescheduleFollowUp,
        addStaff,
        toggleStaffStatus,
        updateStaff,
        deleteStaff,
        updateSheetConfig,
        toggleStaffDistribution,
        selectAllStaffForDistribution,
        syncGoogleSheet,
        cleanAndSyncDatabaseFromSheet,
        restoreStatusesFromCallLogs,
        openLeadDetails,
        closeLeadDetails,
        setIsAddLeadModalOpen,
        setIsAddStaffModalOpen,
        setIsSheetModalOpen,
        resetToDemoData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
