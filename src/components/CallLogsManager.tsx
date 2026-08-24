'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatDateTimeSafe } from '@/lib/formatters';
import { 
  PhoneCall, 
  User, 
  Search 
} from 'lucide-react';
import { CallOutcome } from '@/types/crm';

export const CallLogsManager: React.FC = () => {
  const { callLogs, allStaff, currentUser, leads, openLeadDetails } = useCRM();

  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const accessibleLogs = currentUser.role === 'admin' 
    ? callLogs 
    : callLogs.filter(c => c.staffId === currentUser.uid);

  const filteredLogs = accessibleLogs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      log.leadName.toLowerCase().includes(q) || 
      log.leadPhone.toLowerCase().includes(q) || 
      log.notes.toLowerCase().includes(q) ||
      log.staffName.toLowerCase().includes(q);

    const matchesOutcome = outcomeFilter === 'all' || log.callOutcome === outcomeFilter;
    const matchesStaff = staffFilter === 'all' || log.staffId === staffFilter;

    return matchesSearch && matchesOutcome && matchesStaff;
  });

  const getOutcomeBadge = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'connected':
        return { label: 'Connected', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'callback':
        return { label: 'Callback / Follow-up', color: 'bg-pink-50 text-pink-700 border-pink-200' };
      case 'converted':
        return { label: '🏆 Won / Converted', color: 'bg-purple-50 text-purple-700 border-purple-200 font-bold' };
      case 'no_answer':
        return { label: 'No Answer', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'busy':
        return { label: 'Busy', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'not_interested':
        return { label: 'Not Interested', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: outcome, color: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-pink-50 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Calling History & Records</h2>
              <p className="text-xs text-slate-500 font-medium">
                Complete log of every telecaller discussion, outcome, and timestamp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700">
              <span className="block text-[10px] text-blue-500 uppercase">Total Calls</span>
              <span className="text-base font-black">{accessibleLogs.length}</span>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">
              <span className="block text-[10px] text-emerald-500 uppercase">Converted</span>
              <span className="text-base font-black">{accessibleLogs.filter(c => c.callOutcome === 'converted').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-xs">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client, notes, or telecaller..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="all">All Outcomes</option>
            <option value="connected">Connected</option>
            <option value="callback">Callback / Follow-up</option>
            <option value="converted">Won / Sale Closed</option>
            <option value="no_answer">No Answer</option>
            <option value="busy">Busy</option>
            <option value="not_interested">Not Interested</option>
          </select>

          {currentUser.role === 'admin' && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs"
            >
              <option value="all">All Telecallers</option>
              {allStaff.map(s => (
                <option key={s.uid} value={s.uid}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-4 pl-5 pr-2">Client / Lead</th>
              <th className="px-3 py-4">Call #</th>
              <th className="px-3 py-4">Outcome</th>
              <th className="px-3 py-4">Discussion Notes</th>
              <th className="px-3 py-4">Telecaller</th>
              <th className="px-3 py-4">Duration</th>
              <th className="py-4 pl-2 pr-5 text-right">Timestamp</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <p className="text-sm font-bold text-slate-600">No call logs found</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const badge = getOutcomeBadge(log.callOutcome);
                const targetLead = leads.find(l => l.id === log.leadId);

                return (
                  <tr key={log.id} className="transition-colors hover:bg-blue-50/20">
                    
                    <td className="py-4 pl-5 pr-2">
                      <div>
                        <button
                          onClick={() => targetLead && openLeadDetails(targetLead)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {log.leadName}
                        </button>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{log.leadPhone}</p>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                        Call #{log.callNumber}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <span className={`rounded-xl border px-2.5 py-1 text-xs font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-3 py-4 max-w-sm">
                      <p className="text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                        &ldquo;{log.notes}&rdquo;
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <User className="h-3.5 w-3.5 text-pink-600" />
                        <span>{log.staffName}</span>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-slate-500 font-medium">
                      {log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : '-'}
                    </td>

                    <td className="py-4 pl-2 pr-5 text-right text-[11px] text-slate-400 font-medium" suppressHydrationWarning>
                      {formatDateTimeSafe(log.createdAt)}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
