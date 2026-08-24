'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { X, Plus, HelpCircle, CheckCircle2 } from 'lucide-react';
import { LeadStatus } from '@/types/crm';

export const AddLeadModal: React.FC = () => {
  const { 
    isAddLeadModalOpen, 
    setIsAddLeadModalOpen, 
    addLead, 
    allStaff 
  } = useCRM();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Manual Entry');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dealValue, setDealValue] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({
    'Do You Have A Valid Gst Registration': '✅ Yes',
    'When Are You Planning To Start Your Amazon Business': 'Within 7 Days',
    'Do You Have An Amazon Seller Account': 'No'
  });

  if (!isAddLeadModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please enter client name and phone number.');
      return;
    }

    const assignedStaff = allStaff.find(s => s.uid === assignedTo);

    addLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      source: source || 'Manual Entry',
      assignedTo: assignedTo || null,
      assignedToName: assignedStaff ? assignedStaff.name : undefined,
      status: 'new' as LeadStatus,
      priority,
      dealValue: dealValue ? Number(dealValue) : undefined,
      customFields,
    });

    setIsAddLeadModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setDealValue('');
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 text-slate-900">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Lead</h2>
              <p className="text-xs text-slate-500 font-medium">Enter client info or Amazon seller details</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddLeadModalOpen(false)}
            className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Client Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="Google Sheet (Amazon Seller Ads)">Google Sheet (Amazon Ads)</option>
                <option value="Instagram Ads">Instagram Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Website Form">Website Form</option>
                <option value="WhatsApp Direct">WhatsApp Direct</option>
                <option value="Manual Entry">Manual Entry</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="high">🔥 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">🌱 Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Telecaller</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Auto-Assign (Round-Robin)</option>
                {allStaff.map(s => (
                  <option key={s.uid} value={s.uid}>{s.name} ({s.isActive ? 'Active' : 'Offline'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Q&A Section */}
          <div className="rounded-2xl border border-pink-200 bg-pink-50/50 p-4 space-y-3">
            <h4 className="text-xs font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-pink-600" /> Client Questionnaire:
            </h4>

            {Object.entries(customFields).map(([q, a], idx) => (
              <div key={idx}>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{q}</label>
                <input
                  type="text"
                  value={a}
                  onChange={(e) => handleCustomFieldChange(q, e.target.value)}
                  placeholder={`Answer for "${q}"`}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-blue-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(false)}
              className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-95 active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Create Lead</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
