'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatDateSafe } from '@/lib/formatters';
import { 
  Clock, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  User, 
  RotateCcw
} from 'lucide-react';

export const FollowUpsManager: React.FC = () => {
  const { 
    leads, 
    currentUser, 
    openCallModal, 
    markFollowUpDone, 
    rescheduleFollowUp 
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  const userLeads = currentUser.role === 'admin' 
    ? leads 
    : leads.filter(l => {
        if (!l.assignedTo) return false;
        const cleanUid = (currentUser.uid || '').toLowerCase();
        const cleanEmail = (currentUser.email || '').toLowerCase();
        const cleanName = (currentUser.name || '').toLowerCase();
        const assignedTo = (l.assignedTo || '').toLowerCase();
        const assignedToName = (l.assignedToName || '').toLowerCase();
        return assignedTo === cleanUid || assignedTo === cleanEmail || assignedToName === cleanName;
      });

  const todayFollowUps = userLeads.filter(l => {
    if (l.isFollowUpDone || !l.nextFollowUpDate) return false;
    const fDate = l.nextFollowUpDate.split('T')[0];
    return fDate === todayStr;
  });

  const overdueFollowUps = userLeads.filter(l => {
    if (l.isFollowUpDone || !l.nextFollowUpDate) return false;
    const fDate = l.nextFollowUpDate.split('T')[0];
    return fDate < todayStr;
  });

  const upcomingFollowUps = userLeads.filter(l => {
    if (l.isFollowUpDone || !l.nextFollowUpDate) return false;
    const fDate = l.nextFollowUpDate.split('T')[0];
    return fDate > todayStr;
  });

  const completedFollowUps = userLeads.filter(l => l.isFollowUpDone);

  const getActiveList = () => {
    switch (activeTab) {
      case 'today': return todayFollowUps;
      case 'overdue': return overdueFollowUps;
      case 'upcoming': return upcomingFollowUps;
      case 'completed': return completedFollowUps;
    }
  };

  const currentList = getActiveList();

  const handleSaveReschedule = (leadId: string) => {
    if (!rescheduleDate) return;
    rescheduleFollowUp(leadId, new Date(rescheduleDate).toISOString());
    setRescheduleLeadId(null);
    setRescheduleDate('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="rounded-3xl border border-pink-200 bg-gradient-to-r from-pink-50 via-white to-blue-50 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 border border-pink-200 shadow-xs">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Client Follow-Up & Call Reminders</h2>
              <p className="text-xs text-slate-500 font-medium">
                Track scheduled callbacks so every potential Amazon seller is converted!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700">
              <span className="block text-[10px] text-rose-500 uppercase">Overdue</span>
              <span className="text-base font-black">{overdueFollowUps.length}</span>
            </div>
            <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-2 text-pink-700">
              <span className="block text-[10px] text-pink-500 uppercase">Due Today</span>
              <span className="text-base font-black">{todayFollowUps.length}</span>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
              <span className="block text-[10px] text-blue-500 uppercase">Upcoming</span>
              <span className="text-base font-black">{upcomingFollowUps.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'today', label: `Today's Due (${todayFollowUps.length})`, icon: Clock, color: 'text-pink-600' },
          { id: 'overdue', label: `Overdue (${overdueFollowUps.length})`, icon: AlertTriangle, color: 'text-rose-600' },
          { id: 'upcoming', label: `Upcoming (${upcomingFollowUps.length})`, icon: Calendar, color: 'text-blue-600' },
          { id: 'completed', label: `Completed (${completedFollowUps.length})`, icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {currentList.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No pending follow-ups in this list!</h3>
          <p className="text-xs text-slate-500 mt-1">All scheduled client calls are up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((lead) => {
            const isRescheduling = rescheduleLeadId === lead.id;
            const gstVal = lead.customFields?.['Do You Have A Valid Gst Registration'];
            const timelineVal = lead.customFields?.['When Are You Planning To Start Your Amazon Business'];

            return (
              <div
                key={lead.id}
                className="group relative rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-pink-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{lead.name}</h3>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        {lead.totalCallsCount} calls made
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">{lead.phone}</p>
                  </div>

                  {lead.nextFollowUpDate && (
                    <div className="text-right">
                      <span 
                        suppressHydrationWarning
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${
                          activeTab === 'overdue' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateSafe(lead.nextFollowUpDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Follow-up Note */}
                {lead.followUpNotes && (
                  <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                    <p className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">Notes:</p>
                    <p className="italic text-slate-800">&ldquo;{lead.followUpNotes}&rdquo;</p>
                  </div>
                )}

                {/* Dynamic Q&A Preview */}
                {(gstVal || timelineVal) && (
                  <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                    {gstVal && (
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        GST: {gstVal}
                      </span>
                    )}
                    {timelineVal && (
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        ⏳ {timelineVal}
                      </span>
                    )}
                  </div>
                )}

                {/* Reschedule Inline Form */}
                {isRescheduling && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-3 space-y-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-blue-900">Pick New Follow-up Date & Time:</label>
                    <input
                      type="datetime-local"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRescheduleLeadId(null)}
                        className="rounded-lg bg-slate-200 px-3 py-1 text-xs text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveReschedule(lead.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white"
                      >
                        Update Schedule
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>{lead.assignedToName || 'You'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRescheduling && !lead.isFollowUpDone && (
                      <button
                        onClick={() => {
                          const tom = new Date();
                          tom.setDate(tom.getDate() + 1);
                          tom.setHours(14, 0, 0, 0);
                          setRescheduleDate(tom.toISOString().slice(0, 16));
                          setRescheduleLeadId(lead.id);
                        }}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reschedule</span>
                      </button>
                    )}

                    {!lead.isFollowUpDone && (
                      <button
                        onClick={() => markFollowUpDone(lead.id)}
                        className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Done</span>
                      </button>
                    )}

                    <button
                      onClick={() => openCallModal(lead)}
                      className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Phone className="h-3.5 w-3.5 fill-current" />
                      <span>Call Now</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
