'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { StatCards } from '@/components/StatCards';
import { SalesCharts } from '@/components/SalesCharts';
import { LeadsTable } from '@/components/LeadsTable';
import { FollowUpsManager } from '@/components/FollowUpsManager';
import { CallLogsManager } from '@/components/CallLogsManager';
import { StaffManager } from '@/components/StaffManager';
import { GoogleSheetManager } from '@/components/GoogleSheetManager';
import { SettingsModal } from '@/components/SettingsModal';
import { CallModal } from '@/components/CallModal';
import { LeadDetailsModal } from '@/components/LeadDetailsModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { AddStaffModal } from '@/components/AddStaffModal';
import { AuthScreen } from '@/components/AuthScreen';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  PhoneCall, 
  FileSpreadsheet, 
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function CRMApp() {
  const { currentUser, stats, syncGoogleSheet, sheetConfig, isAuthenticated, leads } = useCRM();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // If user is logged out, show the Login screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const myLeadsCount = currentUser.role === 'admin' 
    ? stats.totalLeads 
    : leads.filter(l => l.assignedTo === currentUser.uid).length;

  const myFollowUpsCount = currentUser.role === 'admin'
    ? stats.followUpsPendingToday
    : leads.filter(l => {
        if (l.assignedTo !== currentUser.uid || l.isFollowUpDone || !l.nextFollowUpDate) return false;
        const fDate = l.nextFollowUpDate.split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        return fDate <= todayStr;
      }).length;

  // Mobile Bottom Navigation
  const mobileNav = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'leads', label: currentUser.role === 'admin' ? 'Leads' : 'My Leads', icon: Users, badge: myLeadsCount },
    { id: 'followups', label: 'Follow-ups', icon: Clock, badge: myFollowUpsCount },
    { id: 'calls', label: 'Calls', icon: PhoneCall },
    ...(currentUser.role === 'admin' ? [{ id: 'sheets', label: 'Sheets', icon: FileSpreadsheet }] : []),
  ];

  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sheetConfig.spreadsheetId || '1VZwM3N3CKVjD2hyQ7ncqgOlYnfvsoiL33dGMn9VCB4U' })
      });
      const data = await res.json();
      if (data.success && data.leads) {
        await syncGoogleSheet(data.leads);
      } else {
        await syncGoogleSheet();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      
      {/* 1. Top Header */}
      <Header 
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 2. Main Body Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Center Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
          
          {/* View: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Welcome Banner in White, Pink & Blue */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-white to-pink-50/80 p-6 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-100 text-pink-600 font-bold">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                      Welcome, {currentUser.name}!
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl">
                    {currentUser.role === 'admin' 
                      ? 'Live Google Sheet connected with 186+ Amazon seller leads, round-robin auto telecaller distribution, and sales revenue analytics.'
                      : 'You have Amazon seller leads assigned with GST status and launch timelines. Click Call to log your discussion.'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Scan Sheet (Admin Only) */}
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={handleQuickSync}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all shadow-xs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-pink-600' : 'text-blue-600'}`} />
                      <span>{isSyncing ? 'Scanning...' : 'Scan Sheet'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('followups')}
                    className="flex items-center gap-1.5 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-bold text-pink-700 hover:bg-pink-100 transition-all shadow-xs"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{myFollowUpsCount} Due</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('leads')}
                    className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-4 py-2 text-xs font-bold text-white hover:opacity-95 transition-all shadow-md shadow-blue-500/25"
                  >
                    <span>{currentUser.role === 'admin' ? 'View All Leads' : 'View My Leads'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <StatCards 
                onNavigateToFollowups={() => setActiveTab('followups')}
                onNavigateToLeads={() => setActiveTab('leads')}
              />

              {/* Sales & Telecalling Velocity Charts */}
              <SalesCharts />

              {/* Recent Leads & Quick Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      {currentUser.role === 'admin' ? 'Inbound Sheet Leads & Client Answers' : 'My Assigned Leads & Client Answers'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Click green &ldquo;Call&rdquo; button to dial client and record call notes</p>
                  </div>

                  <button
                    onClick={() => setActiveTab('leads')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>{currentUser.role === 'admin' ? 'Open Full Pipeline' : 'Open My Leads'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <LeadsTable searchQuery={searchQuery} />
              </div>

            </div>
          )}

          {/* View: ALL LEADS PIPELINE */}
          {activeTab === 'leads' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    {currentUser.role === 'admin' ? 'Leads Management Pipeline' : 'My Assigned Leads Pipeline'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Filter by status, view GST & Amazon seller answers, and manage telecaller call records.
                  </p>
                </div>
              </div>

              <LeadsTable searchQuery={searchQuery} />
            </div>
          )}

          {/* View: FOLLOW-UPS */}
          {activeTab === 'followups' && (
            <div className="animate-in fade-in duration-300">
              <FollowUpsManager />
            </div>
          )}

          {/* View: CALL LOGS */}
          {activeTab === 'calls' && (
            <div className="animate-in fade-in duration-300">
              <CallLogsManager />
            </div>
          )}

          {/* View: STAFF MANAGEMENT (Admin only) */}
          {activeTab === 'staff' && (
            <div className="animate-in fade-in duration-300">
              {currentUser.role === 'admin' ? (
                <StaffManager />
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-slate-700">
                  <h3 className="text-lg font-bold text-rose-700">Admin Access Required</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Only Super Admin can manage telecaller accounts and passwords.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* View: GOOGLE SHEETS SYNC (Admin only) */}
          {activeTab === 'sheets' && (
            <div className="animate-in fade-in duration-300">
              {currentUser.role === 'admin' ? (
                <GoogleSheetManager />
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-slate-700">
                  <h3 className="text-lg font-bold text-rose-700">Admin Access Required</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Google Sheet setup is managed by Super Admin.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* View: SETTINGS (Admin only) */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-300">
              {currentUser.role === 'admin' ? (
                <SettingsModal />
              ) : (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-slate-700">
                  <h3 className="text-lg font-bold text-rose-700">Admin Access Required</h3>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden shadow-lg">
        <div className={`grid ${currentUser.role === 'admin' ? 'grid-cols-5' : 'grid-cols-4'} py-2 px-1`}>
          {mobileNav.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 text-[10px] font-bold transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Global Modals */}
      <CallModal />
      <LeadDetailsModal />
      <AddLeadModal />
      <AddStaffModal />

    </div>
  );
}
