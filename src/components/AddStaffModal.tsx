'use client';

import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { X, UserPlus, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';

export const AddStaffModal: React.FC = () => {
  const { isAddStaffModalOpen, setIsAddStaffModalOpen, addStaff } = useCRM();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [dailyLeadLimit, setDailyLeadLimit] = useState('25');

  if (!isAddStaffModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Please enter staff name and email.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }

    const newStaff = addStaff({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || '+91 90000 00000',
      role,
      dailyLeadLimit: Number(dailyLeadLimit) || 25,
      password: password.trim(),
    } as any);

    // Show credentials clearly so admin can share with telecaller
    alert(
      `✅ Staff Account Created Successfully!\n\n` +
      `👤 Name: ${name.trim()}\n` +
      `📧 Login Email: ${email.trim().toLowerCase()}\n` +
      `🔑 Password: ${password.trim()}\n\n` +
      `Share these credentials with the telecaller to login.`
    );

    setIsAddStaffModalOpen(false);
    setName('');
    setEmail('');
    setPassword('password123');
    setPhone('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl p-6 text-slate-900">
        
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Staff / Telecaller</h2>
              <p className="text-xs text-slate-500 font-medium">Create staff login credentials & lead allocation</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddStaffModalOpen(false)}
            className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Staff Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Gupta"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Login Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@salescrm.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Login Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Staff Login Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 pr-10 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Telecaller will use this password to sign into the CRM.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / Calling Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 00000"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="staff">Sales / Telecaller</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Daily Lead Quota</label>
              <input
                type="number"
                value={dailyLeadLimit}
                onChange={(e) => setDailyLeadLimit(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddStaffModalOpen(false)}
              className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:opacity-90 active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Create Credentials</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
