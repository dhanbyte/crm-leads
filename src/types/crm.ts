export type LeadStatus = 'new' | 'contacted' | 'interested' | 'followup' | 'won' | 'not_interested';

export type CallOutcome = 
  | 'connected' 
  | 'busy' 
  | 'no_answer' 
  | 'callback' 
  | 'not_interested' 
  | 'converted';

export type UserRole = 'admin' | 'staff';

export interface UserStaff {
  uid: string;
  name: string;
  email: string;
  password?: string; // Login password set by Admin
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean; // Available for auto-assignment
  dailyLeadLimit?: number;
  assignedCount: number;
  callsCount: number;
  wonCount: number;
  totalRevenue: number;
  createdAt: string;
}

export interface CustomFieldQA {
  question: string;
  answer: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string; // e.g. "Google Sheet", "Website Form", "Facebook Ads", "Manual"
  sheetRowId?: string;
  
  // Custom Dynamic Q&A from Google Sheets/Form
  customFields: Record<string, string>; // { "Budget": "₹50,000", "Requirement": "CRM App", "Time": "Evening" }
  
  // Assignment
  assignedTo: string | null; // Staff UID
  assignedToName?: string;
  assignedAt?: string;
  
  // Pipeline & Status: New, Contacted, Interested, Follow-up Due, Won, Not Interested
  status: LeadStatus;
  dealValue?: number; // Sale amount in INR
  priority: 'low' | 'medium' | 'high';
  
  // Calling Details
  totalCallsCount: number;
  lastCallAt?: string;
  lastCallOutcome?: CallOutcome;
  lastCallNotes?: string;
  
  // Follow-up Details
  nextFollowUpDate?: string; // ISO string e.g. "2026-08-25T14:30:00"
  followUpNotes?: string;
  isFollowUpDone?: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface CallLog {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  staffId: string;
  staffName: string;
  callNumber: number; // 1st call, 2nd call, etc.
  callOutcome: CallOutcome;
  durationSeconds?: number;
  notes: string;
  nextFollowUpDate?: string;
  createdAt: string;
}

export interface SheetConfig {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetName: string;
  apiKey?: string;
  csvUrl?: string;
  webhookUrl?: string;
  fieldMapping: {
    nameColumn: string;
    phoneColumn: string;
    emailColumn?: string;
    sourceColumn?: string;
  };
  customQuestionColumns: string[]; // List of questions/columns to display in Lead details
  autoAssignEnabled: boolean;
  selectedStaffIds: string[]; // Staff members selected for equal line-by-line round-robin distribution
  autoScanIntervalMinutes: number; // e.g. 3 minutes auto-scan interval
  lastSyncAt?: string;
  totalImported: number;
}

export interface CRMStats {
  totalLeads: number;
  newLeadsToday: number;
  callsToday: number;
  followUpsPendingToday: number;
  totalSalesWon: number;
  totalRevenue: number;
  conversionRate: number;
}
