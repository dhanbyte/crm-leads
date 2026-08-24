'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Trash2, 
  IndianRupee,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Users,
  CheckCircle2,
  Zap,
  UserCheck
} from 'lucide-react';

export const StaffManager: React.FC = () => {
  const { 
    allStaff, 
    currentUser, 
    toggleStaffStatus, 
    deleteStaff, 
    setIsAddStaffModalOpen,
    assignAllLeadsToStaff,
    leads
  } = useCRM();

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleCopyCredentials = (staff: any) => {
    const text = `CRM Login Portal: http://localhost:3000\nEmail: ${staff.email}\nPassword: ${staff.password || 'password123'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(staff.uid);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleAssignAllToThisStaff = (staffId: string, name: string) => {
    const res = assignAllLeadsToStaff(staffId, false);
    setNotice(res.message);
    setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-pink-50 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Staff & Telecaller Management</h2>
              <p className="text-xs text-slate-500 font-medium">
                Add telecallers (e.g. Alfiya Khan), create login credentials, and 1-click assign all leads.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddStaffModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-95 active:scale-95 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add New Telecaller</span>
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Staff Grid Cards / Empty State */}
      {allStaff.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 space-y-4 shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 border border-blue-200">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No telecallers added yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click the button below to add a telecaller (e.g. Alfiya Khan) and set their login email and password.
            </p>
          </div>
          <button
            onClick={() => setIsAddStaffModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add First Telecaller</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allStaff.map((staff) => {
            const conversionRate = staff.assignedCount > 0 
              ? Math.round((staff.wonCount / staff.assignedCount) * 100) 
              : 0;

            const isPasswordVisible = !!visiblePasswords[staff.uid];
            const staffPassword = staff.password || 'password123';

            return (
              <div
                key={staff.uid}
                className={`group relative rounded-3xl border p-5 transition-all duration-300 hover:shadow-lg ${
                  staff.isActive 
                    ? 'border-slate-200 bg-white hover:border-pink-300' 
                    : 'border-slate-200 bg-slate-50/60 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {staff.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={staff.avatarUrl}
                          alt={staff.name}
                          className="h-12 w-12 rounded-2xl object-cover ring-2 ring-blue-500/30"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                          staff.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        {staff.name}
                        {staff.role === 'admin' && <ShieldCheck className="h-4 w-4 text-pink-600" />}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold capitalize">
                        {staff.role === 'admin' ? 'Super Admin' : 'Sales / Telecaller'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStaffStatus(staff.uid)}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                      staff.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {staff.isActive ? '🟢 Active' : '⚪ On Leave'}
                  </button>
                </div>

                {/* Contact & Login Credentials */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate font-semibold text-slate-800">{staff.email}</span>
                  </p>

                  {/* Password display for Admin */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <KeyRound className="h-3.5 w-3.5 text-pink-600 shrink-0" />
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Pass:</span>
                      <span className="font-mono font-bold text-slate-900 truncate">
                        {isPasswordVisible ? staffPassword : '••••••••'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(staff.uid)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                      >
                        {isPasswordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(staff)}
                        className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50"
                        title="Copy Login Credentials"
                      >
                        {copiedId === staff.uid ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === staff.uid ? 'Copied' : 'Share'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Assigned</p>
                    <p className="text-sm font-black text-blue-700 mt-0.5">{staff.assignedCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Calls</p>
                    <p className="text-sm font-black text-pink-700 mt-0.5">{staff.callsCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Sales Won</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{staff.wonCount}</p>
                  </div>
                </div>

                {/* 🚀 1-Click Give All Leads Button */}
                {staff.role === 'staff' && (
                  <button
                    type="button"
                    onClick={() => handleAssignAllToThisStaff(staff.uid, staff.name)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 py-2 px-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-95 transition-all"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>⚡ Give ALL {leads.length} Leads to {staff.name}</span>
                  </button>
                )}

                {/* Revenue */}
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-2.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                    <IndianRupee className="h-3.5 w-3.5" />
                    <span>Revenue: ₹{staff.totalRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {conversionRate}% Conv.
                  </span>
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {staff.isActive ? '⚡ Auto-Assign Ready' : '⏸️ Auto-Assign Paused'}
                  </span>

                  {currentUser.role === 'admin' && staff.uid !== currentUser.uid && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove staff member "${staff.name}"?`)) {
                          deleteStaff(staff.uid);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
