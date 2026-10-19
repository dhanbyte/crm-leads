import { Lead, UserStaff, CallLog, SheetConfig } from '@/types/crm';

// Zero mock staff - Super Admin adds real staff from scratch
export const INITIAL_STAFF: UserStaff[] = [];

export const INITIAL_ADMIN: UserStaff = {
  uid: 'admin-1',
  name: 'Super Admin',
  email: 'admin@salescrm.com',
  password: 'admin',
  role: 'admin',
  phone: '+91 99999 88888',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  isActive: true,
  assignedCount: 0,
  callsCount: 0,
  wonCount: 0,
  totalRevenue: 0,
  createdAt: '2026-07-01T08:00:00Z',
};

export const INITIAL_LEADS: Lead[] = [];
export const INITIAL_CALL_LOGS: CallLog[] = [];

export const INITIAL_SHEET_CONFIG: SheetConfig = {
  id: 'sheet-config-1',
  name: 'Ecommerce Seller Campaign Leads',
  spreadsheetId: '1kJsWX_yOENKKjihAFc92ohO4GYmzH1CQ5ipntS0XsCQ',
  sheetName: 'Sheet1',
  csvUrl: 'https://docs.google.com/spreadsheets/d/1kJsWX_yOENKKjihAFc92ohO4GYmzH1CQ5ipntS0XsCQ/export?format=csv',
  fieldMapping: {
    nameColumn: 'full_name',
    phoneColumn: 'phone_number',
    emailColumn: 'email',
    sourceColumn: 'form_name'
  },
  customQuestionColumns: [
    'Aap Kis Platform Par Selling Shuru Karna Chahte Hain',
    'Kya Aapke Paas Gst Registration Hai',
    'Kya Aapke Paas Seller Account Hai'
  ],
  autoAssignEnabled: true,
  selectedStaffIds: [],
  autoScanIntervalMinutes: 1,
  totalImported: 0,
};
