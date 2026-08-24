'use client';

import React, { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Lead, LeadStatus } from '@/types/crm';
import { formatDateSafe, formatTimeOnly } from '@/lib/formatters';
import { 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  CheckSquare, 
  Square, 
  Download, 
  Trash2, 
  Plus,
  HelpCircle,
  IndianRupee,
  Sparkles,
  ExternalLink,
  Copy,
  CheckCircle2,
  ChevronDown,
  Zap,
  UserCheck,
  Inbox
} from 'lucide-react';

interface LeadsTableProps {
  searchQuery?: string;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({ searchQuery = '' }) => {
  const { 
    leads, 
    currentUser, 
    allStaff, 
    openCallModal, 
    openLeadDetails, 
    updateLeadStatus, 
    bulkUpdateLeadStatus,
    assignLead,
    bulkAssignLeads,
    assignAllLeadsToStaff,
    deleteLead,
    bulkDeleteLeads,
    setIsAddLeadModalOpen
  } = useCRM();

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [gstFilter, setGstFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'calls' | 'name'>('date');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>('contacted');
  const [bulkStaffId, setBulkStaffId] = useState<string>('');
  const [quickAssignStaffId, setQuickAssignStaffId] = useState<string>('');
  const [quickAssignNotice, setQuickAssignNotice] = useState<string | null>(null);

  const staffMembers = useMemo(() => allStaff.filter(s => s.role === 'staff'), [allStaff]);

  // Unassigned leads count
  const unassignedCount = useMemo(() => {
    return leads.filter(l => !l.assignedTo).length;
  }, [leads]);

  // Role Access: Staff only sees their assigned leads, Admin sees all 186+
  const accessibleLeads = useMemo(() => {
    if (currentUser.role === 'admin') {
      return leads;
    }
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

  // Apply search and dropdown filters
  const filteredLeads = useMemo(() => {
    return accessibleLeads.filter(lead => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.toLowerCase().includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.source && lead.source.toLowerCase().includes(query)) ||
        Object.entries(lead.customFields || {}).some(([k, v]) => 
          k.toLowerCase().includes(query) || String(v).toLowerCase().includes(query)
        );

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesStaff = staffFilter === 'all' || 
        (staffFilter === 'unassigned' ? !lead.assignedTo : lead.assignedTo === staffFilter);
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;

      // GST Filter
      const gstVal = (lead.customFields?.['Do You Have A Valid Gst Registration'] || '').toLowerCase();
      const matchesGst = gstFilter === 'all' || 
        (gstFilter === 'yes' && (gstVal.includes('yes') || gstVal.includes('✅'))) ||
        (gstFilter === 'no' && (gstVal.includes('no') || gstVal.includes('❌')));

    }).sort((a, b) => {
      // 1. Untouched 'new' leads ALWAYS show at the very TOP
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (b.status === 'new' && a.status !== 'new') return 1;

      // 2. Sort by selected criteria or newest first
      if (sortBy === 'calls') return (b.totalCallsCount || 0) - (a.totalCallsCount || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [accessibleLeads, searchQuery, statusFilter, staffFilter, priorityFilter, gstFilter, sortBy]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkStatus = () => {
    if (selectedLeadIds.length === 0) return;
    bulkUpdateLeadStatus(selectedLeadIds, bulkStatus);
    alert(`Updated status of ${selectedLeadIds.length} leads to "${bulkStatus.toUpperCase()}"!`);
    setSelectedLeadIds([]);
  };

  const handleApplyBulkAssign = () => {
    if (selectedLeadIds.length === 0 || !bulkStaffId) return;
    bulkAssignLeads(selectedLeadIds, bulkStaffId);
    alert(`Assigned ${selectedLeadIds.length} leads to staff member!`);
    setSelectedLeadIds([]);
  };

  const handleQuickAssignAll = () => {
    const sId = quickAssignStaffId || (staffMembers[0]?.uid || '');
    if (!sId) {
      alert('Please select a staff member first.');
      return;
    }
    const res = assignAllLeadsToStaff(sId, false);
    setQuickAssignNotice(res.message);
    setTimeout(() => setQuickAssignNotice(null), 5000);
  };

  const handleClaimAllUnassigned = () => {
    const res = assignAllLeadsToStaff(currentUser.uid, false);
    setQuickAssignNotice(`Loaded all ${res.updatedCount} leads into your calling list!`);
    setTimeout(() => setQuickAssignNotice(null), 5000);
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    if (confirm(`Delete ${selectedLeadIds.length} selected leads?`)) {
      bulkDeleteLeads(selectedLeadIds);
      setSelectedLeadIds([]);
    }
  };

  const handleCopyPhone = (e: React.MouseEvent, leadId: string, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(leadId);
    setTimeout(() => setCopiedPhoneId(null), 2500);
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string, name: string) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(`Hello ${name}, thank you for your interest in Amazon Seller launch! When is a good time to connect?`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // Status Styling Configuration
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return { label: 'New Lead', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'contacted':
        return { label: 'Contacted', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'interested':
        return { label: 'Interested ⭐', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' };
      case 'followup':
        return { label: 'Follow-up Due', bg: 'bg-pink-50 text-pink-700 border-pink-200 font-bold' };
      case 'won':
        return { label: 'Won / Sale Closed', bg: 'bg-purple-50 text-purple-700 border-purple-200 font-bold' };
      case 'not_interested':
        return { label: 'Not Interested', bg: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Export to CSV (Admin Only)
  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Source', 'Status', 'Calls Count', 'Deal Value', 'Assigned To', 'GST Registration', 'Timeline', 'Seller Account', 'Created Date'];
    const rows = filteredLeads.map(l => [
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.source || ''}"`,
      `"${l.status}"`,
      l.totalCallsCount || 0,
      l.dealValue || 0,
      `"${l.assignedToName || 'Unassigned'}"`,
      `"${l.customFields?.['Do You Have A Valid Gst Registration'] || ''}"`,
      `"${l.customFields?.['When Are You Planning To Start Your Amazon Business'] || ''}"`,
      `"${l.customFields?.['Do You Have An Amazon Seller Account'] || ''}"`,
      `"${formatDateSafe(l.createdAt)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* 🚀 1. SUPER ADMIN QUICK ASSIGN ALL LEADS BAR */}
      {currentUser.role === 'admin' && staffMembers.length > 0 && (
        <div className="rounded-3xl border border-pink-200 bg-gradient-to-r from-pink-50/80 via-white to-blue-50/80 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-100 text-pink-600 font-bold">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900">1-Click Bulk Assign Leads to One Staff</p>
              <p className="text-[11px] text-slate-500 font-medium">Saari {leads.length} leads turant kisi ek telecaller (jaise Alfiya Khan) ko assign karein:</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={quickAssignStaffId || staffMembers[0]?.uid || ''}
              onChange={(e) => setQuickAssignStaffId(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:border-pink-500 focus:outline-none"
            >
              {staffMembers.map(s => (
                <option key={s.uid} value={s.uid}>
                  {s.name} ({s.assignedCount} leads assigned)
                </option>
              ))}
            </select>

            <button
              onClick={handleQuickAssignAll}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:opacity-95 active:scale-95 transition-all"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Assign ALL {leads.length} Leads Now</span>
            </button>
          </div>
        </div>
      )}

      {/* 📥 2. TELECALLER CLAIM ALL LEADS BANNER (Visible for staff when leads are waiting) */}
      {currentUser.role === 'staff' && unassignedCount > 0 && (
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-pink-50 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {unassignedCount} Google Sheet Leads Available in CRM
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Click below to pull and assign all available leads into your pipeline.
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimAllUnassigned}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-95 active:scale-95 transition-all"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>📥 Load All {leads.length} Leads for Calling</span>
          </button>
        </div>
      )}

      {quickAssignNotice && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{quickAssignNotice}</span>
        </div>
      )}

      {/* 3. Status Filter Pills & Search Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-xs">
        
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: currentUser.role === 'admin' ? 'All Leads' : 'My Leads', count: accessibleLeads.length },
            { id: 'new', label: 'New', count: accessibleLeads.filter(l => l.status === 'new').length },
            { id: 'contacted', label: 'Contacted', count: accessibleLeads.filter(l => l.status === 'contacted').length },
            { id: 'interested', label: 'Interested ⭐', count: accessibleLeads.filter(l => l.status === 'interested').length },
            { id: 'followup', label: 'Follow-ups', count: accessibleLeads.filter(l => l.status === 'followup').length },
            { id: 'won', label: 'Won / Sales', count: accessibleLeads.filter(l => l.status === 'won').length },
            { id: 'not_interested', label: 'Not Interested', count: accessibleLeads.filter(l => l.status === 'not_interested').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* GST Filter */}
          <select
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none shadow-xs"
          >
            <option value="all">GST: All</option>
            <option value="yes">GST: ✅ Yes</option>
            <option value="no">GST: ❌ No</option>
          </select>

          {/* Staff Filter (Admin only) */}
          {currentUser.role === 'admin' && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-blue-500 focus:outline-none shadow-xs"
            >
              <option value="all">All Telecallers</option>
              <option value="unassigned">Unassigned</option>
              {allStaff.map(s => (
                <option key={s.uid} value={s.uid}>{s.name}</option>
              ))}
            </select>
          )}

          {/* Export CSV (Admin Only - Hidden for Staff) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={handleExportCSV}
              title="Export leads to Excel/CSV"
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}

          {/* Add Lead (Admin Only) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Lead</span>
            </button>
          )}

        </div>

      </div>

      {/* 4. Bulk Action Bar (Visible when checkboxes are selected) */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              {selectedLeadIds.length}
            </span>
            <span className="text-xs font-bold text-blue-950">leads selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Bulk Status Update */}
            <div className="flex items-center gap-1">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as LeadStatus)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <option value="new">Mark New</option>
                <option value="contacted">Mark Contacted</option>
                <option value="interested">Mark Interested ⭐</option>
                <option value="followup">Mark Follow-up Due</option>
                <option value="won">Mark Won / Closed</option>
                <option value="not_interested">Mark Not Interested</option>
              </select>
              <button
                onClick={handleApplyBulkStatus}
                className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
              >
                Apply Status
              </button>
            </div>

            {/* Bulk Staff Assign (Admin Only) */}
            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-1">
                <select
                  value={bulkStaffId}
                  onChange={(e) => setBulkStaffId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
                >
                  <option value="">Select Telecaller...</option>
                  {allStaff.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleApplyBulkAssign}
                  className="rounded-xl bg-pink-600 px-3 py-1 text-xs font-bold text-white hover:bg-pink-700"
                >
                  Assign Staff
                </button>
              </div>
            )}

            {/* Bulk Delete (Admin Only) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 ml-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 📱 5. MOBILE-OPTIMIZED LEAD CARDS (Visible on Phone Screens < md) */}
      <div className="block md:hidden space-y-3.5">
        {filteredLeads.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-700">No leads found in this filter</p>
            <p className="text-xs mt-1">All active leads will appear here.</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isSelected = selectedLeadIds.includes(lead.id);
            const gstVal = lead.customFields?.['Do You Have A Valid Gst Registration'] || 'No';
            const timelineVal = lead.customFields?.['When Are You Planning To Start Your Amazon Business'] || '30 Days';
            const sellerAccVal = lead.customFields?.['Do You Have An Amazon Seller Account'] || 'No';
            const callsCount = lead.totalCallsCount || 0;

            const isGstYes = gstVal.toLowerCase().includes('yes') || gstVal.includes('✅');
            const isSellerYes = sellerAccVal.toLowerCase().includes('yes') || sellerAccVal.includes('✅');

            return (
              <div
                key={lead.id}
                className={`rounded-3xl border transition-all p-4 bg-white shadow-xs space-y-3 ${
                  isSelected ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                {/* TOP: Client Name & Phone */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button 
                      onClick={() => handleToggleSelect(lead.id)} 
                      className="mt-1 text-slate-400 hover:text-blue-600 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 
                          onClick={() => openLeadDetails(lead)}
                          className="text-base font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                        >
                          {lead.name}
                        </h3>
                        {lead.status === 'new' && (
                          <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0 animate-ping" title="New Lead" />
                        )}
                      </div>

                      {/* Phone Number with quick action */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-mono font-bold text-xs text-blue-600 hover:underline"
                        >
                          {lead.phone}
                        </a>
                        <button
                          onClick={(e) => handleCopyPhone(e, lead.id, lead.phone)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Copy phone"
                        >
                          {copiedPhoneId === lead.id ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Call Count Pill */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      callsCount > 0 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <PhoneCall className="h-2.5 w-2.5" />
                      <span>{callsCount > 0 ? `${callsCount} Calls` : 'Not Called'}</span>
                    </span>
                  </div>
                </div>

                {/* MIDDLE: 3 Details in 1 Single Horizontal Row */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  
                  {/* Detail 1: GST Status */}
                  <div className={`rounded-2xl border p-2 flex flex-col items-center justify-center ${
                    isGstYes 
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                  }`}>
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">GST</span>
                    <span className="text-xs font-bold truncate mt-0.5">
                      {isGstYes ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>

                  {/* Detail 2: Timeline */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-2 flex flex-col items-center justify-center text-blue-950">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Timeline</span>
                    <span className="text-[11px] font-bold truncate mt-0.5" title={timelineVal}>
                      ⏳ {timelineVal.replace(/Within/i, '').trim() || '30 Days'}
                    </span>
                  </div>

                  {/* Detail 3: Amazon Seller Account */}
                  <div className={`rounded-2xl border p-2 flex flex-col items-center justify-center ${
                    isSellerYes 
                      ? 'bg-purple-50/80 border-purple-200 text-purple-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Amazon A/C</span>
                    <span className="text-xs font-bold truncate mt-0.5">
                      {isSellerYes ? '🛒 Active' : '❌ No'}
                    </span>
                  </div>

                </div>

                {/* STATUS SELECTOR BOX */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Pipeline Status:</span>
                    {lead.nextFollowUpDate && (
                      <span className="text-pink-600 flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3" />
                        <span suppressHydrationWarning>{formatDateSafe(lead.nextFollowUpDate)}</span>
                      </span>
                    )}
                  </div>

                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="new">🔵 New Lead</option>
                    <option value="contacted">🌐 Contacted</option>
                    <option value="interested">🟢 Interested ⭐</option>
                    <option value="followup">🟣 Follow-up Due</option>
                    <option value="won">🏆 Won / Sale Closed</option>
                    <option value="not_interested">🔴 Not Interested</option>
                  </select>
                </div>

                {/* BOTTOM ACTION ROW: Big Green Call Button + Quick Actions */}
                <div className="flex items-center gap-2 pt-1">
                  
                  {/* Primary Big Green Call Button */}
                  <button
                    onClick={() => openCallModal(lead)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 py-3 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                  >
                    <Phone className="h-4 w-4 fill-current" />
                    <span>Call Client #{callsCount + 1}</span>
                  </button>

                  {/* WhatsApp Quick Button */}
                  <button
                    onClick={(e) => handleWhatsApp(e, lead.phone, lead.name)}
                    className="flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shrink-0"
                    title="Chat on WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  {/* View Full Sheet Answers */}
                  <button
                    onClick={() => openLeadDetails(lead)}
                    className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
                    title="View Form Answers"
                  >
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 💻 6. DESKTOP FULL TABLE (Visible on Screens >= md) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-4 pl-4 pr-1 w-8">
                  <button onClick={handleSelectAll} className="p-1 text-slate-400 hover:text-blue-600">
                    {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 pl-2 pr-2">Client / Lead</th>
                <th className="px-3 py-4">Sheet Answers (GST • Timeline • Seller A/C)</th>
                
                {/* Assigned Staff Column (Super Admin Only) */}
                {currentUser.role === 'admin' && (
                  <th className="px-3 py-4">Assigned Staff</th>
                )}

                <th className="px-3 py-4">Status & Pipeline</th>
                <th className="px-3 py-4">Calling History</th>
                <th className="px-3 py-4">Next Follow-Up</th>
                <th className="py-4 pl-2 pr-5 text-right">Quick Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role === 'admin' ? 8 : 7} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-600">No leads found in this filter</p>
                    <p className="text-xs mt-1">All active leads will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const statusInfo = getStatusBadge(lead.status);
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const gstVal = lead.customFields?.['Do You Have A Valid Gst Registration'];
                  const timelineVal = lead.customFields?.['When Are You Planning To Start Your Amazon Business'];
                  const sellerAccVal = lead.customFields?.['Do You Have An Amazon Seller Account'];

                  return (
                    <tr 
                      key={lead.id} 
                      className={`group transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-blue-50/20'}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-4 pr-1">
                        <button onClick={() => handleToggleSelect(lead.id)} className="p-1 text-slate-400 hover:text-blue-600">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      
                      {/* 1. Lead Name & Phone */}
                      <td className="py-4 pl-2 pr-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-xs">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => openLeadDetails(lead)}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left text-sm"
                              >
                                {lead.name}
                              </button>
                              {lead.status === 'new' && (
                                <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping" title="New untouched lead" />
                              )}
                            </div>
                            
                            <p className="text-slate-600 font-mono font-semibold text-xs mt-0.5">
                              {lead.phone}
                            </p>
                            
                            <span className="inline-block text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                              {lead.source}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Dynamic Q&A from Google Sheets */}
                      <td className="px-3 py-4 max-w-sm">
                        <div 
                          onClick={() => openLeadDetails(lead)}
                          className="cursor-pointer space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5 transition-colors hover:border-pink-300 hover:bg-pink-50/30"
                        >
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {gstVal && (
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                                gstVal.includes('Yes') || gstVal.includes('✅') 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                GST: {gstVal}
                              </span>
                            )}

                            {timelineVal && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold truncate max-w-[170px]">
                                ⏳ {timelineVal}
                              </span>
                            )}

                            {sellerAccVal && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold truncate max-w-[170px]">
                                Amazon A/C: {sellerAccVal}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-pink-600 font-bold pt-0.5">
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> View all Sheet answers
                            </span>
                            <span className="text-slate-400 font-normal">Click to expand</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Assigned Staff (Super Admin Only) */}
                      {currentUser.role === 'admin' && (
                        <td className="px-3 py-4">
                          <select
                            value={lead.assignedTo || ''}
                            onChange={(e) => assignLead(lead.id, e.target.value || null)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {allStaff.map(s => (
                              <option key={s.uid} value={s.uid}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* 4. Pipeline Status Selector */}
                      <td className="px-3 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className={`rounded-xl border px-2.5 py-1 text-xs font-bold focus:outline-none ${statusInfo.bg}`}
                        >
                          <option value="new">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="interested">Interested ⭐</option>
                          <option value="followup">Follow-up Due</option>
                          <option value="won">Won / Sale Closed</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                        
                        {lead.dealValue ? (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <IndianRupee className="h-3 w-3" />
                            <span>₹{lead.dealValue.toLocaleString('en-IN')} Closed</span>
                          </p>
                        ) : null}
                      </td>

                      {/* 5. Calling History */}
                      <td className="px-3 py-4">
                        {lead.totalCallsCount > 0 ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                              <PhoneCall className="h-3 w-3" />
                              {lead.totalCallsCount} {lead.totalCallsCount === 1 ? 'Call' : 'Calls'} Logged
                            </span>
                            {lead.lastCallOutcome && (
                              <p className="mt-1 text-[10px] text-slate-500 capitalize">
                                Last: <strong className="text-slate-800">{lead.lastCallOutcome.replace('_', ' ')}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Not Called Yet
                          </span>
                        )}
                      </td>

                      {/* 6. Next Follow-Up */}
                      <td className="px-3 py-4">
                        {lead.nextFollowUpDate ? (
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 text-xs font-bold text-pink-600" suppressHydrationWarning>
                              <Clock className="h-3.5 w-3.5" />
                              {formatDateSafe(lead.nextFollowUpDate)}
                            </span>
                            <span className="text-[10px] text-slate-400 block" suppressHydrationWarning>
                              {formatTimeOnly(lead.nextFollowUpDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 7. Quick Actions */}
                      <td className="py-4 pl-2 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Direct Green Call Button */}
                          <button
                            onClick={() => openCallModal(lead)}
                            title="Call Lead & Log Notes"
                            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Phone className="h-3.5 w-3.5 fill-current" />
                            <span>Call</span>
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={(e) => handleWhatsApp(e, lead.phone, lead.name)}
                            title="Message on WhatsApp"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => openLeadDetails(lead)}
                            title="View Full Questionnaire & Call Notes"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete (Admin Only) */}
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete lead "${lead.name}"?`)) {
                                  deleteLead(lead.id);
                                }
                              }}
                              title="Delete Lead"
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
