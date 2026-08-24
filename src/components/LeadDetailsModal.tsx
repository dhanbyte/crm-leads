'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { LeadStatus } from '@/types/crm';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/formatters';
import { 
  X, 
  Phone, 
  Mail, 
  Clock, 
  User, 
  HelpCircle, 
  PhoneCall,
  Sparkles
} from 'lucide-react';

const isAdMetadata = (key: string) => {
  return /ad\s*name|adset\s*name|campaign\s*name|form\s*name|platform|is_organic|retailer|page_id/i.test(key);
};

export const LeadDetailsModal: React.FC = () => {
  const { 
    selectedLeadForView, 
    isLeadModalOpen, 
    closeLeadDetails, 
    openCallModal, 
    updateLeadStatus, 
    callLogs, 
    currentUser,
    allStaff 
  } = useCRM();

  if (!isLeadModalOpen || !selectedLeadForView) return null;

  const lead = selectedLeadForView;
  const customFieldsEntries = Object.entries(lead.customFields || {}).filter(([q]) => !isAdMetadata(q));
  const leadCallHistory = callLogs.filter(c => c.leadId === lead.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 text-slate-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-md shadow-blue-500/25">
              {lead.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  {lead.source}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Added: <span suppressHydrationWarning>{formatDateSafe(lead.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                closeLeadDetails();
                openCallModal(lead);
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
            >
              <Phone className="h-3.5 w-3.5 fill-current" />
              <span>Call Client</span>
            </button>

            <button
              onClick={closeLeadDetails}
              className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contact Info Pills */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Phone / WhatsApp</p>
              <p className="text-sm font-mono font-bold text-slate-900">{lead.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {lead.email || 'No email provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Questionnaire Responses (Ad metadata hidden) */}
        <div className="mt-5 rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50/50 via-white to-blue-50/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Client Questionnaire Answers
              </h3>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
              {customFieldsEntries.length} Answers
            </span>
          </div>

          {customFieldsEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No questionnaire responses mapped for this lead.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customFieldsEntries.map(([question, answer], idx) => (
                <div 
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs"
                >
                  <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{question}</span>
                  </p>
                  <p className="mt-1 text-xs font-bold text-pink-700">
                    {answer || '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Stage & Assigned Staff Info */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-xs text-slate-500 font-semibold mb-1.5">Pipeline Stage</p>
            <select
              value={lead.status}
              onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-blue-700 focus:outline-none focus:border-blue-500 shadow-xs"
            >
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested ⭐</option>
              <option value="followup">Follow-up Due</option>
              <option value="won">Won / Sale Closed</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-xs text-slate-500 font-semibold mb-1.5">Assigned Telecaller</p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mt-1">
              <User className="h-4 w-4 text-blue-600" />
              <span>{lead.assignedToName || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Next Follow-up Banner */}
        {lead.nextFollowUpDate && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-pink-200 bg-pink-50 p-3 text-xs">
            <div className="flex items-center gap-2 text-pink-800 font-bold">
              <Clock className="h-4 w-4 text-pink-600" />
              <span>Next Follow-up Scheduled:</span>
            </div>
            <span className="font-bold text-pink-700" suppressHydrationWarning>
              {formatDateSafe(lead.nextFollowUpDate)}
            </span>
          </div>
        )}

        {/* Calling History Timeline */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4 text-blue-600" />
            Communication & Call History ({leadCallHistory.length} records):
          </h3>

          {leadCallHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No calls logged yet. Click &ldquo;Call Client&rdquo; above to log first conversation.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leadCallHistory.map((call) => (
                <div key={call.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">
                        Call #{call.callNumber}
                      </span>
                      <span className="capitalize">{call.callOutcome.replace('_', ' ')}</span>
                    </div>
                    <span className="text-[10px] text-slate-400" suppressHydrationWarning>
                      {formatDateTimeSafe(call.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-700 italic bg-white p-2 rounded-xl border border-slate-100">
                    &ldquo;{call.notes}&rdquo;
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400 font-medium">Logged by: {call.staffName}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
