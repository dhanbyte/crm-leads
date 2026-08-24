'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { generateGoogleAppsScript } from '@/lib/googleAppsScript';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Sliders, 
  ExternalLink,
  Code2,
  Zap,
  Users,
  CheckSquare,
  Square,
  Clock,
  ArrowRight,
  UserCheck
} from 'lucide-react';

export const GoogleSheetManager: React.FC = () => {
  const { 
    sheetConfig, 
    updateSheetConfig, 
    syncGoogleSheet, 
    allStaff, 
    toggleStaffDistribution,
    selectAllStaffForDistribution,
    assignAllLeadsToStaff,
    leads,
    setIsAddStaffModalOpen,
    isAutoScanning,
    lastAutoScanTime
  } = useCRM();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/leads/webhook` 
    : 'https://your-domain.com/api/leads/webhook';

  const scriptCode = generateGoogleAppsScript(webhookUrl);
  const selectedStaffIds = sheetConfig.selectedStaffIds || [];
  const staffMembers = allStaff.filter(s => s.role === 'staff');

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sheetConfig.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U' })
      });
      const data = await res.json();
      if (data.success && data.leads) {
        const syncRes = await syncGoogleSheet(data.leads);
        setSyncStatus(`✓ Successfully fetched and loaded ${data.count} live leads from your Google Sheet!`);
      } else {
        const syncRes = await syncGoogleSheet();
        setSyncStatus(`✓ ${syncRes.message}`);
      }
    } catch (e: any) {
      setSyncStatus(`❌ Sync notice: ${e?.message || 'Sheet checked'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignAll = (onlyUnassigned = false) => {
    const sId = targetStaffId || (staffMembers[0]?.uid || '');
    if (!sId) {
      alert('Please select a staff member first.');
      return;
    }
    const res = assignAllLeadsToStaff(sId, onlyUnassigned);
    setAssignNotice(res.message);
    setTimeout(() => setAssignNotice(null), 5000);
  };

  const handleDirectAssignToStaff = (e: React.MouseEvent, sId: string, name: string) => {
    e.stopPropagation();
    const res = assignAllLeadsToStaff(sId, false);
    setAssignNotice(res.message);
    setTimeout(() => setAssignNotice(null), 5000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    updateSheetConfig({
      customQuestionColumns: [...sheetConfig.customQuestionColumns, newQuestion.trim()]
    });
    setNewQuestion('');
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = [...sheetConfig.customQuestionColumns];
    updated.splice(idx, 1);
    updateSheetConfig({ customQuestionColumns: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-pink-50 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Google Sheet Connection & Auto-Scan</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Auto-Scan Every {sheetConfig.autoScanIntervalMinutes || 3} Mins
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Connected Sheet ID: <code className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-blue-600 font-mono text-[11px]">1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <span>Open Sheet</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Fetching All Leads...' : '🔄 Scan Google Sheet Now'}</span>
            </button>
          </div>
        </div>

        {syncStatus && (
          <div className="mt-4 rounded-2xl bg-white border border-emerald-300 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* 🚀 1-CLICK INSTANT BULK ASSIGN TO A SPECIFIC STAFF MEMBER (e.g. Alfiya Khan) */}
      <div className="rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50/60 via-white to-blue-50/60 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-pink-600" />
              1-Click Transfer / Assign All {leads.length} Leads to One Telecaller
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Agar aap saari scanned leads abhi kisi ek staff ko dena chahte hain, toh yahan se direct 1-click me assign karein:
            </p>
          </div>

          <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700 border border-pink-200">
            Total {leads.length} Leads in CRM
          </span>
        </div>

        {staffMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-5 text-center text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800">No staff members created yet.</p>
            <p>Pehle <strong>Staff & Team</strong> tab me jakar staff add karein (jaise Alfiya Khan).</p>
            <button
              onClick={() => setIsAddStaffModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:bg-pink-700"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Telecaller (e.g. Alfiya Khan)</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Telecaller:
              </label>
              <select
                value={targetStaffId || staffMembers[0]?.uid || ''}
                onChange={(e) => setTargetStaffId(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white p-2.5 text-xs font-bold text-slate-800 shadow-xs focus:border-pink-500 focus:outline-none"
              >
                {staffMembers.map(s => (
                  <option key={s.uid} value={s.uid}>
                    {s.name} ({s.assignedCount} leads currently assigned)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-2 pt-5 sm:pt-0">
              <button
                type="button"
                onClick={() => handleAssignAll(false)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:opacity-95 active:scale-95 transition-all"
              >
                <UserCheck className="h-4 w-4" />
                <span>Assign ALL {leads.length} Leads to Selected Staff</span>
              </button>

              <button
                type="button"
                onClick={() => handleAssignAll(true)}
                className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-xs active:scale-95 transition-all"
              >
                <span>Assign Only Unassigned Leads</span>
              </button>
            </div>
          </div>
        )}

        {assignNotice && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{assignNotice}</span>
          </div>
        )}
      </div>

      {/* 🌟 SUPER ADMIN TELECALLER DISTRIBUTION SELECTOR */}
      <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Staff Selection for Auto Lead Distribution Pool
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Jitne bhi staff members yahan select honge, aage aane wali Google Sheet leads unme <strong>equal Round-Robin</strong> order me distribute hongi.
            </p>
          </div>

          {staffMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllStaffForDistribution}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                Select All Telecallers
              </button>
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-bold text-pink-700 border border-pink-200">
                {selectedStaffIds.length} Selected in Pool
              </span>
            </div>
          )}
        </div>

        {/* Staff Checkbox Grid / Empty Note */}
        {staffMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">No telecallers created yet.</p>
            <p>Go to the <strong>Staff & Team</strong> tab and click <strong>&ldquo;+ Add New Telecaller&rdquo;</strong> to add your team members.</p>
            <button
              onClick={() => setIsAddStaffModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 mt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Telecaller Now</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffMembers.map((staff) => {
              const isSelected = selectedStaffIds.includes(staff.uid);

              return (
                <div
                  key={staff.uid}
                  onClick={() => toggleStaffDistribution(staff.uid)}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20' 
                      : 'border-slate-200 bg-slate-50 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-blue-600">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 fill-blue-600 text-white" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-900">{staff.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {staff.assignedCount} leads assigned • {staff.isActive ? '🟢 Active' : '⚪ Offline'}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}>
                      {isSelected ? 'IN POOL' : 'EXCLUDED'}
                    </span>
                  </div>

                  {/* 1-Click assign all to this staff */}
                  <button
                    type="button"
                    onClick={(e) => handleDirectAssignToStaff(e, staff.uid, staff.name)}
                    className="mt-3 flex items-center justify-center gap-1 w-full rounded-xl bg-white border border-blue-200 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-xs"
                  >
                    <span>⚡ Give All {leads.length} Leads to {staff.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Sheet Config & Auto-Scan Interval */}
        <div className="space-y-6">
          
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              Sheet Configuration & Auto-Scan Interval
            </h3>

            {/* Auto-Scan Interval Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-pink-600" /> Auto-Scan Google Sheet Frequency:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '1 Min', val: 1 },
                  { label: '3 Mins ⭐', val: 3 },
                  { label: '5 Mins', val: 5 },
                  { label: '10 Mins', val: 10 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => updateSheetConfig({ autoScanIntervalMinutes: item.val })}
                    className={`rounded-2xl py-2 text-xs font-bold border transition-all ${
                      (sheetConfig.autoScanIntervalMinutes || 3) === item.val
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                System automatically scans your Google Sheet in background every {sheetConfig.autoScanIntervalMinutes || 3} minutes and auto-assigns new leads!
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Google Spreadsheet ID</label>
              <input
                type="text"
                value={sheetConfig.spreadsheetId}
                onChange={(e) => updateSheetConfig({ spreadsheetId: e.target.value })}
                placeholder="1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sheet Tab Name</label>
                <input
                  type="text"
                  value={sheetConfig.sheetName}
                  onChange={(e) => updateSheetConfig({ sheetName: e.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Assign Status</label>
                <button
                  type="button"
                  onClick={() => updateSheetConfig({ autoAssignEnabled: !sheetConfig.autoAssignEnabled })}
                  className={`w-full rounded-2xl p-2.5 text-xs font-bold border transition-colors ${
                    sheetConfig.autoAssignEnabled 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {sheetConfig.autoAssignEnabled ? '⚡ Round-Robin ON' : '⏸️ Auto-Assign OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Questions & Answers Mapping */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-pink-600" />
              Dynamic Client Question Columns
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {sheetConfig.customQuestionColumns.map((q, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-xs"
                >
                  <span className="text-slate-800 font-bold truncate">❓ {q}</span>
                  <button
                    onClick={() => handleRemoveQuestion(idx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. Do You Have A Valid GST Registration"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
              />
              <button
                onClick={handleAddQuestion}
                className="flex items-center gap-1 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Google Apps Script Webhook */}
        <div className="space-y-6">
          
          <div className="rounded-3xl border border-pink-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-pink-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Real-Time Webhook Apps Script
                </h3>
              </div>
              
              <button
                onClick={handleCopyScript}
                className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  copiedScript 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-md shadow-pink-500/25'
                }`}
              >
                {copiedScript ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Script Code'}</span>
              </button>
            </div>

            <div className="rounded-2xl bg-pink-50/70 border border-pink-200 p-3.5 text-xs text-pink-950 space-y-2">
              <p className="font-bold text-pink-900 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-pink-600" /> Instant Real-Time Setup:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] font-medium leading-relaxed">
                <li>In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Paste this script and click <strong>Save</strong>.</li>
                <li>Click <strong>Triggers</strong> (Clock icon) &gt; <strong>Add Trigger</strong> &gt; Select <strong>On Form Submit</strong>.</li>
                <li>Every new lead instantly auto-assigns among your active staff members!</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">CRM Webhook URL:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs font-mono font-bold text-blue-700"
                />
                <button
                  onClick={handleCopyWebhook}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 hover:text-slate-900 shadow-xs"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="max-h-64 overflow-y-auto rounded-2xl bg-slate-900 p-3 text-[11px] font-mono text-pink-300 border border-slate-800">
                {scriptCode}
              </pre>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
