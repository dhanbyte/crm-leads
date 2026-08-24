'use client';

import React, { useState, useEffect } from 'react';
import { useCRM } from '@/context/CRMContext';
import { CallOutcome } from '@/types/crm';
import { 
  X, 
  Phone, 
  Calendar, 
  IndianRupee, 
  HelpCircle, 
  PhoneCall, 
  CheckCircle2
} from 'lucide-react';

const isAdMetadata = (key: string) => {
  return /ad\s*name|adset\s*name|campaign\s*name|form\s*name|platform|is_organic|retailer|page_id/i.test(key);
};

export const CallModal: React.FC = () => {
  const { 
    selectedLeadForCall, 
    isCallModalOpen, 
    closeCallModal, 
    logCall, 
    currentUser 
  } = useCRM();

  const [outcome, setOutcome] = useState<CallOutcome>('connected');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isDialed, setIsDialed] = useState(false);

  useEffect(() => {
    if (selectedLeadForCall) {
      setNotes('');
      setDealValue('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      setNextFollowUpDate(tomorrow.toISOString().slice(0, 16));
      setOutcome('connected');
      setIsDialed(false);
    }
  }, [selectedLeadForCall]);

  if (!isCallModalOpen || !selectedLeadForCall) return null;

  const lead = selectedLeadForCall;
  const nextCallNumber = (lead.totalCallsCount || 0) + 1;

  const filteredQAs = Object.entries(lead.customFields || {}).filter(([q]) => !isAdMetadata(q));

  const handleDial = () => {
    setIsDialed(true);
    window.open(`tel:${lead.phone}`, '_self');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!notes.trim()) {
      alert('Please enter short call notes to save the record.');
      return;
    }

    logCall({
      leadId: lead.id,
      outcome,
      durationSeconds: duration,
      notes: notes.trim(),
      nextFollowUpDate: outcome === 'callback' || outcome === 'connected' ? new Date(nextFollowUpDate).toISOString() : undefined,
      dealValue: outcome === 'converted' && dealValue ? Number(dealValue) : undefined,
    });
  };

  const outcomeOptions: { id: CallOutcome; label: string; icon: string; color: string }[] = [
    { id: 'connected', label: 'Connected / Discussing', icon: '🟢', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
    { id: 'callback', label: 'Call Back / Follow-up', icon: '🔄', color: 'border-pink-300 text-pink-800 bg-pink-50' },
    { id: 'no_answer', label: 'No Answer / Ringing', icon: '📵', color: 'border-blue-300 text-blue-800 bg-blue-50' },
    { id: 'busy', label: 'Busy / Cut Call', icon: '⚠️', color: 'border-amber-300 text-amber-800 bg-amber-50' },
    { id: 'converted', label: '🏆 Won / Sale Closed!', icon: '🎉', color: 'border-purple-300 text-purple-800 bg-purple-50 shadow-md' },
    { id: 'not_interested', label: 'Not Interested / Junk', icon: '❌', color: 'border-rose-300 text-rose-800 bg-rose-50' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 text-slate-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 font-bold">
                <PhoneCall className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">Calling Assistant & Logger</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                Call #{nextCallNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Telecaller: <strong className="text-slate-800">{currentUser.name}</strong>
            </p>
          </div>

          <button
            onClick={closeCallModal}
            className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Client Quick Context Card */}
        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">{lead.name}</h3>
              <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">{lead.phone}</p>
            </div>

            {/* Direct Call Button */}
            <button
              onClick={handleDial}
              type="button"
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all ${
                isDialed 
                  ? 'bg-slate-600 text-white' 
                  : 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-600/30 hover:scale-105 active:scale-95'
              }`}
            >
              <Phone className="h-4 w-4 fill-current" />
              <span>{isDialed ? '✓ Dialed (Click to Redial)' : 'Click to Dial Now'}</span>
            </button>
          </div>

          {/* Dynamic Q&A Snippet (Filtered) */}
          {filteredQAs.length > 0 && (
            <div className="mt-3 border-t border-slate-200 pt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-600 mb-1.5 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Client Sheet Responses:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {filteredQAs.slice(0, 4).map(([q, a], idx) => (
                  <div key={idx} className="rounded-xl bg-white border border-slate-200/80 p-2">
                    <span className="text-[10px] text-slate-500 font-medium block truncate">{q}:</span>
                    <span className="font-bold text-blue-700 block truncate">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Log Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {/* 1. Outcome Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Call Outcome / Disposition:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {outcomeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutcome(opt.id)}
                  className={`flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all ${
                    outcome === opt.id
                      ? `${opt.color} ring-2 ring-blue-500 scale-[1.02]`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span className="mt-1 text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Converted Deal Value Input */}
          {outcome === 'converted' && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 animate-in zoom-in-95">
              <label className="block text-xs font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4" /> Enter Closed Deal / Sale Value (₹):
              </label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full rounded-xl border border-purple-200 bg-white p-2.5 text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}

          {/* Follow-up Date/Time */}
          {(outcome === 'callback' || outcome === 'connected') && (
            <div className="rounded-2xl border border-pink-200 bg-pink-50/50 p-3.5 animate-in fade-in">
              <label className="block text-xs font-bold text-pink-900 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Next Follow-Up Date & Time:
              </label>
              <input
                type="datetime-local"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full rounded-xl border border-pink-200 bg-white p-2 text-xs font-bold text-pink-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          )}

          {/* Call Discussion Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Call Discussion Notes:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with client. Has active GST number. Wants to launch Amazon store in 7 days..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeCallModal}
              className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-90 active:scale-95 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save Call Record</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
