'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, Trophy, Calendar, LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      // We fetch a hardcoded admin profile since login is removed
      // Replace with your actual Admin UUID if you want specific data
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (data) setProfile(data);
      setLoading(false);
    };

    fetchAdminProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">EngageX Dashboard</h1>
            <p className="text-slate-500 mt-1 text-lg">
              System Administrator: <span className="font-bold text-blue-600">{profile?.full_name || 'Savishka Nishen'}</span>
            </p>
          </div>
          <div className="flex gap-4">
             <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               Dev Mode Active
             </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DashboardCard 
            title="User Management" 
            icon={<Users size={28}/>} 
            color="bg-purple-600" 
            desc="Direct access to accounts and permissions." 
            onClick={() => router.push('/admin/users')}
          />
          <DashboardCard 
            title="Club Management" 
            icon={<Trophy size={28}/>} 
            color="bg-orange-500" 
            desc="Oversee and approve club registrations." 
            onClick={() => router.push('/admin/clubs')}
          />
          <DashboardCard 
            title="Event Monitoring" 
            icon={<Calendar size={28}/>} 
            color="bg-emerald-500" 
            desc="Live tracking and attendance analytics." 
            onClick={() => router.push('/admin/events')}
          />
          <DashboardCard 
            title="System Stats" 
            icon={<LayoutDashboard size={28}/>} 
            color="bg-blue-600" 
            desc="Platform health and performance metrics." 
            onClick={() => router.push('/admin/stats')}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, icon, color, desc, onClick }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
      <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-2 text-slate-800">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">{desc}</p>
      <button 
        onClick={onClick}
        className="text-blue-600 font-bold flex items-center gap-1 group-hover:gap-3 transition-all"
      >
        Manage Module <span>→</span>
      </button>
    </div>
  );
}