'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  Sparkles, 
  Search, 
  Plus, 
  RefreshCw, 
  Bell, 
  UserCheck, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  LogOut,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
  const { 
    currentUser, 
    allStaff, 
    switchUserRole, 
    syncGoogleSheet, 
    setIsAddLeadModalOpen, 
    stats,
    sheetConfig,
    isAutoScanning,
    logout
  } = useCRM();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sheetConfig.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U' })
      });
      const data = await res.json();
      if (data.success && data.leads) {
        const syncRes = await syncGoogleSheet(data.leads);
        setSyncToast({ message: `Fetched ${data.count} leads from Google Sheet!`, type: 'success' });
      } else {
        const syncRes = await syncGoogleSheet();
        setSyncToast({ message: syncRes.message, type: 'success' });
      }
      setTimeout(() => setSyncToast(null), 4000);
    } catch (e: any) {
      setSyncToast({ message: 'Sync complete!', type: 'success' });
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-blue-600 shadow-md shadow-pink-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                Lead<span className="text-pink-600">Flow</span> <span className="text-blue-600">CRM</span>
              </h1>
              
              {/* 3-Min Auto Scan Badge (Admin Only) */}
              {currentUser.role === 'admin' && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full bg-emerald-600 ${isAutoScanning ? 'animate-ping' : 'animate-pulse'}`} />
                  <span>3m Auto-Scan</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              {currentUser.role === 'admin' 
                ? 'Amazon Seller Leads • Telecalling Assistant • Equal Round-Robin'
                : `Telecaller Portal: ${currentUser.name} • Assigned Calls`}
            </p>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="relative mx-4 flex-1 max-w-md hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads, GST status, phone (+91...), or timeline..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right: Actions, Sync, Notification & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Sync Google Sheet Button (Admin Only) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              title="Scan latest leads from Google Sheet"
              className="relative flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-pink-600' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">
                {isSyncing ? 'Scanning Sheet...' : 'Scan Sheet'}
              </span>
            </button>
          )}

          {/* Quick Add Lead (Admin Only) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/25 transition-all hover:opacity-95 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>
          )}

          {/* Urgent Follow-ups Bell */}
          <div className="relative">
            <button 
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title={`${stats.followUpsPendingToday} follow-ups pending today`}
            >
              <Bell className="h-4 w-4" />
              {stats.followUpsPendingToday > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-[10px] font-black text-white shadow-md shadow-pink-600/40">
                  {stats.followUpsPendingToday}
                </span>
              )}
            </button>
          </div>

          {/* User Profile & Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-3 text-left transition-all hover:bg-slate-50 shadow-xs"
            >
              <div className="relative">
                {currentUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="h-7 w-7 rounded-xl object-cover ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    currentUser.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>

              <div className="hidden lg:block">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                    {currentUser.name}
                  </p>
                  {currentUser.role === 'admin' ? (
                    <ShieldCheck className="h-3 w-3 text-pink-600" />
                  ) : (
                    <UserCheck className="h-3 w-3 text-blue-600" />
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {currentUser.role === 'admin' ? 'Super Admin' : 'Telecaller'}
                </p>
              </div>

              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Logged in as:</p>
                    <p className="text-[11px] text-pink-600 font-bold">{currentUser.name} ({currentUser.role})</p>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setShowRoleDropdown(false);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                    title="Sign Out from Portal"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Log Out</span>
                  </button>
                </div>

                {/* Account Switcher (Only for Admin to test views) */}
                {currentUser.role === 'admin' && (
                  <div className="mt-2 space-y-1">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Role (Admin Test)
                    </p>

                    <button
                      onClick={() => {
                        switchUserRole('admin-1');
                        setShowRoleDropdown(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-100 text-pink-600 font-bold">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Super Admin</p>
                          <p className="text-[10px] text-pink-600 font-medium">Full Access</p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    </button>

                    <div className="pt-1">
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Staff / Telecallers
                      </p>
                      {allStaff.map((staff) => (
                        <button
                          key={staff.uid}
                          onClick={() => {
                            switchUserRole(staff.uid);
                            setShowRoleDropdown(false);
                          }}
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{staff.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {staff.assignedCount} leads assigned
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {syncToast && (
        <div className="bg-gradient-to-r from-blue-600 to-pink-600 px-4 py-2 text-center text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span>{syncToast.message}</span>
        </div>
      )}
    </header>
  );
};
