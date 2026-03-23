'use client';
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Trophy, Calendar, LogOut } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const modules = [
  { title: 'System Dashboard', desc: 'Monitor system health and analytics.', icon: LayoutDashboard, color: 'bg-blue-500', href: '/admin/stats' },
  { title: 'User Management', desc: 'Manage accounts and edit roles.', icon: Users, color: 'bg-purple-500', href: '/admin/users' },
  { title: 'Club Management', desc: 'Oversee clubs and approve requests.', icon: Trophy, color: 'bg-orange-500', href: '/admin/clubs' },
  { title: 'Event Monitoring', desc: 'Track live events and scheduling.', icon: Calendar, color: 'bg-emerald-500', href: '/admin/events' },
];

export default function AdminDashboard() {
  const [adminName, setAdminName] = useState<string>('Administrator');
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Redirect if not logged in
        return;
      }
      // Fetching the name from the profiles table we created earlier
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) setAdminName(profile.full_name);
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Top Header with Admin Name */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-sm font-medium text-blue-600">AdminHub Portal</p>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {adminName}</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m) => (
          <Link href={m.href} key={m.title} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${m.color} rounded-lg flex items-center justify-center mb-4 text-white`}>
              <m.icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{m.title}</h3>
            <p className="text-gray-500 mt-2 text-sm">{m.desc}</p>
            <span className="text-blue-600 mt-4 block font-medium group-hover:underline">Action →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}