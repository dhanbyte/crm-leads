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
  assignAllLeadsToStaff: (staffId: string, onlyUnassigned?: boolean) => { updatedCount: number; message: string };
  deleteLead: (leadId: string) => void;
  bulkDeleteLeads: (leadIds: string[]) => void;
  
  // Call Operations
  openCallModal: (lead: Lead) => void;
  closeCallModal: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState(true);
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

  useEffect(() => {
    rawStaffRef.current = rawStaff;
  }, [rawStaff]);

  useEffect(() => {
    sheetConfigRef.current = sheetConfig;
  }, [sheetConfig]);

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

  // Sync / Import Google Sheet with Instant Batch Save (Guarantees all 186 leads load)
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

    const currentStaffList = rawStaffRef.current.filter(s => !isLegacyMockStaff(s));
    const currentConfig = sheetConfigRef.current;
    const selectedIds = currentConfig.selectedStaffIds || [];
    const pool = currentStaffList.filter(s => s.isActive && s.role === 'staff' && (selectedIds.length === 0 || selectedIds.includes(s.uid)));
    const activeStaffPool = pool.length > 0 ? pool : currentStaffList.filter(s => s.isActive && s.role === 'staff');

    let distributionIndex = 0;

    setLeads(currentLeads => {
      const existingMap = new Map(currentLeads.map(l => [l.phone, l]));
      const leadsToSave: Lead[] = [];
      const updatedList: Lead[] = [];

      for (const item of leadsToProcess) {
        if (!item.phone) continue;

        let assignedId: string | null = null;
        let assignedName: string | undefined = undefined;

        if (currentConfig.autoAssignEnabled && activeStaffPool.length > 0) {
          const staff = activeStaffPool[distributionIndex % activeStaffPool.length];
          assignedId = staff.uid;
          assignedName = staff.name;
          distributionIndex++;
        }

        const existing = existingMap.get(item.phone);
        if (existing) {
          // If existing lead was unassigned but we now have an active telecaller, assign it!
          if (!existing.assignedTo && assignedId) {
            const modified: Lead = {
              ...existing,
              assignedTo: assignedId,
              assignedToName: assignedName,
              assignedAt: now,
              updatedAt: now
            };
            leadsToSave.push(modified);
            updatedList.push(modified);
          } else {
            updatedList.push(existing);
          }
        } else {
          const newLead: Lead = {
            id: `lead-sheet-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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
          leadsToSave.push(newLead);
          updatedList.push(newLead);
          addedCount++;
        }
      }

      // Save immediately to Cloud Firestore and Server Store in batch
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
      message: `Loaded ${leadsToProcess.length} total real leads from Google Sheet!`
    };
  }, []);

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
      if (savedAuth !== null) setIsAuthenticated(JSON.parse(savedAuth));
    } catch (e) {
      console.warn('Storage read warning:', e);
    }

    setIsInitialized(true);

    // 2. Fetch clean staff from DB
    fetchAllStaffFromFirestore().then(staffFromDb => {
      if (staffFromDb && Array.isArray(staffFromDb)) {
        const clean = staffFromDb.filter(s => !isLegacyMockStaff(s));
        setRawStaff(clean);
      }
    });

    // 3. Fetch leads from Firestore, or force sync if fewer than 50 leads
    fetchAllLeadsFromFirestore().then(leadsFromDb => {
      if (leadsFromDb && leadsFromDb.length > 50) {
        setLeads(leadsFromDb);
      } else {
        syncGoogleSheet();
      }
    });

    // 4. Subscribe to Firestore real-time updates
    const unsubLeads = subscribeToLeads((firestoreLeads) => {
      if (firestoreLeads && firestoreLeads.length > 0) {
        setLeads(firestoreLeads);
        try {
          localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(firestoreLeads));
        } catch (e) {}
      }
    });

    const unsubStaff = subscribeToStaff((firestoreStaff) => {
      if (firestoreStaff && Array.isArray(firestoreStaff)) {
        const clean = firestoreStaff.filter(s => !isLegacyMockStaff(s));
        setRawStaff(clean);
        try {
          localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(clean));
        } catch (e) {}
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
  }, []);

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
        saveLeadToFirestore(modified);
        return modified;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, []);

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
        saveLeadToFirestore(modified);
        return modified;
      });

      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });
  }, []);

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

  // ⚡ 1-Click Assign ALL Leads to One Staff Member (e.g. Alfiya)
  const assignAllLeadsToStaff = useCallback((staffId: string, onlyUnassigned = false): { updatedCount: number; message: string } => {
    const cleanId = (staffId || '').toLowerCase();
    const staff = rawStaffRef.current.find(s => 
      s.uid.toLowerCase() === cleanId || 
      s.email.toLowerCase() === cleanId ||
      s.name.toLowerCase() === cleanId
    ) || (rawStaffRef.current.length > 0 ? rawStaffRef.current[0] : null);

    if (!staff) {
      return { updatedCount: 0, message: 'Please select a valid staff member.' };
    }
    const now = new Date().toISOString();
    let updatedCount = 0;
    const leadsToSave: Lead[] = [];

    setLeads(prev => {
      const updated = prev.map(lead => {
        if (onlyUnassigned && lead.assignedTo) return lead;
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

    // Auto select this staff for future incoming leads too
    setSheetConfig(prev => {
      const updated = {
        ...prev,
        selectedStaffIds: [staff.uid]
      };
      saveSettingsToFirestore(updated);
      return updated;
    });

    return {
      updatedCount,
      message: `Successfully assigned all ${updatedCount} leads to ${staff.name}!`
    };
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
      else if (targetLead.status === 'new') statusToSet = 'contacted';
    }

    const updatedLead: Lead = {
      ...targetLead,
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
  }, [leads, currentUser]);

  // Mark Follow-up Done
  const markFollowUpDone = useCallback((leadId: string) => {
    const now = new Date().toISOString();
    setLeads(prev => {
      const updated = prev.map(lead => {
        if (lead.id !== leadId) return lead;
        const modified = { ...lead, isFollowUpDone: true, updatedAt: now };
        saveLeadToFirestore(modified);
        return modified;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

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
        saveLeadToFirestore(modified);
        return modified;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

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

    saveStaffToFirestore(newStaff);

    setSheetConfig(prev => ({
      ...prev,
      selectedStaffIds: [...(prev.selectedStaffIds || []), newStaff.uid]
    }));

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
        deleteLead,
        bulkDeleteLeads,
        openCallModal,
        closeCallModal,
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
