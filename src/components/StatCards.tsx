'use client';

import React, { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  Users, 
  IndianRupee, 
  PhoneOutgoing, 
  CalendarClock, 
  ArrowUpRight 
} from 'lucide-react';

interface StatCardsProps {
  onNavigateToFollowups?: () => void;
  onNavigateToLeads?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ onNavigateToFollowups, onNavigateToLeads }) => {
  const { stats, currentUser, leads, callLogs } = useCRM();

  // Role-scoped metrics (with flexible matching by UID, email, or name)
  const myLeads = useMemo(() => {
    if (currentUser.role === 'admin') return leads;
    const cleanUid = (currentUser.uid || '').toLowerCase();
    const cleanEmail = (currentUser.email || '').toLowerCase();
    const cleanName = (currentUser.name || '').toLowerCase();

    return leads.filter(l => {
      if (!l.assignedTo) return false;
      const assignedTo = (l.assignedTo || '').toLowerCase();
      const assignedToName = (l.assignedToName || '').toLowerCase();
      return assignedTo === cleanUid || assignedTo === cleanEmail || assignedToName === cleanName;
    });
  }, [leads, currentUser]);

  const totalLeadsCount = myLeads.length;
  const newLeadsCount = myLeads.filter(l => l.status === 'new').length;

  const wonLeads = myLeads.filter(l => l.status === 'won');
  const revenueValue = currentUser.role === 'admin' 
    ? stats.totalRevenue 
    : wonLeads.reduce((sum, l) => sum + (l.dealValue || 0), 0);

  const wonCount = currentUser.role === 'admin' ? stats.totalSalesWon : wonLeads.length;
  const convRate = totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0;

  const myCallsToday = currentUser.role === 'admin'
    ? stats.callsToday
    : callLogs.filter(c => 
        c.staffId === currentUser.uid || 
        c.staffName?.toLowerCase() === currentUser.name?.toLowerCase()
      ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const myFollowUpsDue = myLeads.filter(l => {
    if (l.isFollowUpDone || !l.nextFollowUpDate) return false;
    const fDate = l.nextFollowUpDate.split('T')[0];
    return fDate <= todayStr;
  }).length;

  const cards = [
    {
      title: currentUser.role === 'admin' ? 'Total Sheet Leads' : 'My Assigned Leads',
      value: totalLeadsCount,
      subValue: `+${newLeadsCount} new leads`,
      icon: Users,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-100 text-blue-600',
      valueColor: 'text-blue-900',
      action: onNavigateToLeads,
    },
    {
      title: currentUser.role === 'admin' ? 'Total Sales & Revenue' : 'My Closed Revenue',
      value: `₹${revenueValue.toLocaleString('en-IN')}`,
      subValue: `${wonCount} deals won (${convRate}% conv.)`,
      icon: IndianRupee,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-100 text-emerald-600',
      valueColor: 'text-emerald-900',
    },
    {
      title: 'Calls Made Today',
      value: myCallsToday,
      subValue: `Telecalling Activity`,
      icon: PhoneOutgoing,
      gradient: 'from-pink-500/10 via-pink-500/5 to-transparent',
      borderColor: 'border-pink-200 hover:border-pink-400',
      iconBg: 'bg-pink-100 text-pink-600',
      valueColor: 'text-pink-900',
    },
    {
      title: 'Follow-ups Due Today',
      value: myFollowUpsDue,
      subValue: myFollowUpsDue > 0 ? 'Requires immediate callback' : 'All caught up!',
      icon: CalendarClock,
      gradient: myFollowUpsDue > 0 
        ? 'from-rose-500/15 via-pink-500/5 to-transparent' 
        : 'from-blue-500/10 via-blue-500/5 to-transparent',
      borderColor: myFollowUpsDue > 0 ? 'border-rose-300 hover:border-rose-400' : 'border-slate-200 hover:border-blue-300',
      iconBg: myFollowUpsDue > 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600',
      valueColor: myFollowUpsDue > 0 ? 'text-rose-600' : 'text-slate-900',
      action: onNavigateToFollowups,
      highlight: myFollowUpsDue > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={card.action}
            className={`group relative overflow-hidden rounded-3xl border ${card.borderColor} bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              card.action ? 'cursor-pointer' : ''
            }`}
          >
            {/* Soft gradient backdrop */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-70 transition-opacity group-hover:opacity-100`} />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {card.title}
                </p>
                <h3 className={`mt-2 text-2xl font-black tracking-tight sm:text-3xl ${card.valueColor}`}>
                  {card.value}
                </h3>
              </div>

              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconBg} shadow-xs`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className={`text-xs font-semibold ${card.highlight ? 'text-rose-600' : 'text-slate-500'}`}>
                {card.subValue}
              </span>
              
              {card.action && (
                <span className="flex items-center text-xs font-bold text-blue-600 transition-transform group-hover:translate-x-0.5">
                  View <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
