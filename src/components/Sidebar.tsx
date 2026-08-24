'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  PhoneCall, 
  UserPlus, 
  FileSpreadsheet, 
  Settings, 
  Flame,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, stats, leads } = useCRM();

  // If staff, calculate only their assigned leads count
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

  const navItems = [
    {
      id: 'dashboard',
      label: 'Sales Dashboard',
      icon: LayoutDashboard,
      badge: null,
      adminOnly: false,
    },
    {
      id: 'leads',
      label: currentUser.role === 'admin' ? 'Leads Pipeline' : 'My Assigned Leads',
      icon: Users,
      badge: myLeadsCount > 0 ? myLeadsCount : null,
      adminOnly: false,
    },
    {
      id: 'followups',
      label: 'Follow-ups Manager',
      icon: Clock,
      badge: myFollowUpsCount > 0 ? `${myFollowUpsCount} Due` : null,
      badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
      adminOnly: false,
    },
    {
      id: 'calls',
      label: 'Call Logs & History',
      icon: PhoneCall,
      badge: stats.callsToday > 0 ? `${stats.callsToday} today` : null,
      adminOnly: false,
    },
    {
      id: 'staff',
      label: 'Staff & Team',
      icon: UserPlus,
      badge: null,
      adminOnly: true,
    },
    {
      id: 'sheets',
      label: 'Google Sheet Sync',
      icon: FileSpreadsheet,
      badge: currentUser.role === 'admin' ? '186+ Leads' : null,
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      adminOnly: true, // Only Super Admin manages Sheet Sync & Staff Distribution
    },
    {
      id: 'settings',
      label: 'Settings & Firebase',
      icon: Settings,
      badge: null,
      adminOnly: true, // Only Super Admin manages Settings
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white hidden md:flex md:flex-col justify-between p-4 shadow-xs">
      <div className="space-y-6">
        
        {/* Profile Card Banner */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50/50 via-pink-50/30 to-white p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              {currentUser.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="h-10 w-10 rounded-2xl object-cover ring-2 ring-pink-500/40"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  currentUser.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-pink-500' : 'bg-blue-500'}`} />
                <span className="text-[11px] font-semibold text-slate-500 capitalize">
                  {currentUser.role === 'admin' ? 'Super Admin' : 'Sales Telecaller'}
                </span>
              </div>
            </div>
          </div>

          {currentUser.role === 'staff' && (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-white border border-slate-100 p-2 text-center text-[10px] shadow-xs">
              <div>
                <p className="text-slate-400 font-medium">Assigned</p>
                <p className="font-bold text-blue-600">{myLeadsCount}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Calls</p>
                <p className="font-bold text-pink-600">{currentUser.callsCount}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Won</p>
                <p className="font-bold text-emerald-600">{currentUser.wonCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Menu
          </p>

          {navItems.map((item) => {
            if (item.adminOnly && currentUser.role !== 'admin') {
              return null;
            }

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'text-slate-500 group-hover:text-blue-600'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                      isActive ? 'bg-white/20 text-white border-white/30' : (item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-3 w-3 text-white" />}
                </div>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Pink & Blue Monthly Target Footer */}
      <div className="rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-blue-50 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-pink-600">
            <Flame className="h-4 w-4 fill-pink-500/20" />
            <span className="text-xs font-bold tracking-tight text-slate-900">
              {currentUser.role === 'admin' ? 'Monthly Target' : 'My Sales Goal'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {myLeadsCount > 0 ? Math.round(((currentUser.role === 'admin' ? stats.totalSalesWon : currentUser.wonCount) / myLeadsCount) * 100) : 0}% Conv.
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-1.5 font-medium">
          Revenue: <span className="font-bold text-slate-900">₹{(currentUser.role === 'admin' ? stats.totalRevenue : currentUser.totalRevenue).toLocaleString('en-IN')}</span>
        </p>

        {/* Pink & Blue Gradient Progress Bar */}
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-pink-500 to-rose-500 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(15, ((currentUser.role === 'admin' ? stats.totalRevenue : currentUser.totalRevenue) / 1000000) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5 text-[10px] font-semibold text-slate-500">
          <span>{currentUser.role === 'admin' ? stats.totalSalesWon : currentUser.wonCount} Deals Closed</span>
          <span>Goal: ₹10 Lakhs</span>
        </div>
      </div>

    </aside>
  );
};
