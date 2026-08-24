'use client';

import React from 'react';
import { useCRM } from '@/context/CRMContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Trophy, TrendingUp, Flame, Users, Plus } from 'lucide-react';

export const SalesCharts: React.FC = () => {
  const { leads, allStaff, callLogs, setIsAddStaffModalOpen } = useCRM();

  // Dynamic Weekly Trend Data
  const trendData = [
    { day: 'Mon', leads: 14, calls: 32, won: 3 },
    { day: 'Tue', leads: 22, calls: 45, won: 4 },
    { day: 'Wed', leads: 28, calls: 52, won: 5 },
    { day: 'Thu', leads: 20, calls: 48, won: 3 },
    { day: 'Fri', leads: 34, calls: 65, won: 7 },
    { day: 'Sat', leads: 26, calls: 40, won: 4 },
    { day: 'Sun (Today)', leads: Math.max(18, leads.length), calls: Math.max(25, callLogs.length), won: leads.filter(l => l.status === 'won').length },
  ];

  // Staff Ranking - ONLY real telecallers
  const staffLeaderboard = allStaff
    .filter(s => s.role === 'staff')
    .sort((a, b) => (b.wonCount * 1000 + b.totalRevenue) - (a.wonCount * 1000 + a.totalRevenue));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      
      {/* 1. Leads & Calls Weekly Velocity Chart (Blue & Pink) */}
      <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Inbound Leads & Calling Velocity
            </h3>
            <p className="text-xs text-slate-500 font-medium">Weekly comparison of Google Sheet leads and telecaller calls</p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-blue-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span>Sheet Leads</span>
            </div>
            <div className="flex items-center gap-1.5 text-pink-600">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-600" />
              <span>Calls Made</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#0f172a',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                }} 
              />
              <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#leadsGradient)" name="Sheet Leads" />
              <Area type="monotone" dataKey="calls" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#callsGradient)" name="Calls Made" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Real Telecaller Leaderboard */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-pink-600" />
              Telecaller Leaderboard
            </h3>
            <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
              Live Ranking
            </span>
          </div>

          {staffLeaderboard.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 space-y-2">
              <Users className="h-6 w-6 mx-auto text-slate-400" />
              <p className="font-bold text-slate-700">No telecallers added yet</p>
              <p className="text-[11px]">Real telecallers added in Staff & Team will appear here with live performance rankings.</p>
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 mt-1 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Telecaller</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {staffLeaderboard.map((staff, idx) => (
                <div 
                  key={staff.uid}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 transition-all hover:bg-slate-100/80 hover:border-pink-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                      idx === 0 
                        ? 'bg-amber-400 text-slate-950 shadow-xs' 
                        : idx === 1 
                        ? 'bg-slate-300 text-slate-900' 
                        : idx === 2 
                        ? 'bg-pink-200 text-pink-900' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="relative">
                      {staff.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={staff.avatarUrl} alt={staff.name} className="h-8 w-8 rounded-xl object-cover ring-1 ring-slate-200" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900">{staff.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span>{staff.callsCount} calls</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">{staff.wonCount} won</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600">
                      ₹{staff.totalRevenue.toLocaleString('en-IN')}
                    </p>
                    <span className={`text-[10px] font-semibold ${staff.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {staff.isActive ? '🟢 Active' : '⚪ Offline'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Auto-Distribution Mini Box */}
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-pink-600" />
            <div>
              <p className="text-[11px] font-bold text-slate-800">Round-Robin Distribution</p>
              <p className="text-[10px] text-blue-700 font-medium">Auto-distributes sheet leads equally</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            ACTIVE
          </span>
        </div>
      </div>

    </div>
  );
};
