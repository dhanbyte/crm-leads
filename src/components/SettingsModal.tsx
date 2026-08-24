'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  Settings, 
  Database, 
  Flame, 
  RotateCcw, 
  Download 
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { 
    sheetConfig, 
    updateSheetConfig, 
    resetToDemoData, 
    leads, 
    allStaff, 
    callLogs 
  } = useCRM();

  const handleBackup = () => {
    const backup = {
      leads,
      allStaff,
      callLogs,
      sheetConfig,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `crm_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-pink-50 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">System Settings & Firebase Database</h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure backend database credentials, lead assignment rules, and data backups.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Firebase Credentials Panel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Firebase Firestore (crm-tool-34eba)
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              🟢 Connected & Live
            </span>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Connected to your Firebase project <strong>crm-tool-34eba</strong> for real-time Firestore database sync and authentication.
          </p>

          <div className="rounded-2xl bg-slate-900 p-3 font-mono text-[11px] text-pink-300 border border-slate-800 space-y-1">
            <p>PROJECT_ID: &quot;crm-tool-34eba&quot;</p>
            <p>AUTH_DOMAIN: &quot;crm-tool-34eba.firebaseapp.com&quot;</p>
            <p>STATUS: &quot;Active & Real-Time Syncing&quot;</p>
          </div>
        </div>

        {/* Lead Automation Rules */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="h-5 w-5 text-pink-600" />
            Lead Auto-Distribution Rules
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <div>
                <p className="text-xs font-bold text-slate-900">Round-Robin Auto Assignment</p>
                <p className="text-[11px] text-slate-500 font-medium">Distributes Google Sheet leads equally among active staff</p>
              </div>

              <button
                type="button"
                onClick={() => updateSheetConfig({ autoAssignEnabled: !sheetConfig.autoAssignEnabled })}
                className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  sheetConfig.autoAssignEnabled
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {sheetConfig.autoAssignEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <div>
                <p className="text-xs font-bold text-slate-900">Duplicate Phone Detection</p>
                <p className="text-[11px] text-slate-500 font-medium">Prevents duplicate records if same client fills sheet again</p>
              </div>

              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Backup & Reset Card */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Data Management
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleBackup}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Download className="h-4 w-4 text-blue-600" />
              <span>Export Database Backup (JSON)</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Reset CRM database to fresh initial leads and staff?')) {
                  resetToDemoData();
                  alert('Reset complete!');
                }
              }}
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
