'use client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, Users, CheckCircle, Clock, Search, 
  ChevronLeft, Filter, Loader2, Plus, X, PauseCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClubEvent {
  id: string;
  title: string;
  event_date: string;
  registrations: number;
  attendance_rate: number;
  status: 'approved' | 'pending' | 'cancelled' | 'hold';
  clubs?: { name: string; id: string };
}

export default function EventMonitoring() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [clubs, setClubs] = useState<{id: string, name: string}[]>([]);
  const [stats, setStats] = useState({ total: 0, regs: 0, avgAtt: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Form State
  const [newEvent, setNewEvent] = useState({ title: '', club_id: '', event_date: '', status: 'pending' });

  const fetchData = useCallback(async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select(`*, clubs(id, name)`)
      .order('event_date', { ascending: false });
      

    const { data: clubData } = await supabase.from('clubs').select('id, name');

    if (eventData) {
      const typedData = eventData as ClubEvent[];
      setEvents(typedData);
      setClubs(clubData || []);

      const totalRegs = typedData.reduce((acc: number, curr: ClubEvent) => acc + (curr.registrations || 0), 0);
      const pendingCount = typedData.filter((e: ClubEvent) => e.status === 'pending').length;
      
      setStats({
        total: typedData.length,
        regs: totalRegs,
        avgAtt: 87, 
        pending: pendingCount
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
  fetchData();

  const channel = supabase
    .channel('live-events-panel')
    .on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'events' }, 
      (payload: any) => { // Adding : any or a specific interface fixes the error
        console.log('Change received!', payload);
        fetchData(); 
      }
    )
    .subscribe();

  return () => { 
    supabase.removeChannel(channel); 
  };
}, [fetchData]);

const updateStatus = async (eventId: string, status: string) => {
  // Optimistic Update: Update UI immediately so it feels "Instant"
  setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: status as any } : ev));

  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);
    
  if (error) {
    alert(error.message);
    fetchData(); // Rollback if error
  } else {
    // We call fetchData to ensure the Stats (total pending, etc.) update correctly
    fetchData();
  }
};
const handleCreateEvent = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true); // Show loader during creation

  const { error } = await supabase.from('events').insert([newEvent]);
  
  if (error) {
    alert(error.message);
    setLoading(false);
  } else {
    setIsModalOpen(false);
    setNewEvent({ title: '', club_id: '', event_date: '', status: 'pending' });
    // Fetch data ensures the new item appears and stats recalculate
    await fetchData(); 
  }
};

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-8 font-sans text-slate-700">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all uppercase text-xs tracking-widest">
            <ChevronLeft size={16} /> Back to Hub
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 text-white flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
            >
              <Plus size={18} /> Add Event
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Events" value={stats.total} icon={<Calendar size={20}/>} color="text-slate-400" bg="bg-slate-100" />
          <StatCard title="Registrations" value={stats.regs.toLocaleString()} icon={<Users size={20}/>} color="text-blue-500" bg="bg-blue-50" />
          <StatCard title="Attendance" value={`${stats.avgAtt}%`} icon={<CheckCircle size={20}/>} color="text-emerald-500" bg="bg-emerald-50" />
          <StatCard title="Pending" value={stats.pending} icon={<Clock size={20}/>} color="text-orange-500" bg="bg-orange-50" isAlert />
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
              <tr>
                <th className="px-8 py-5">Event</th>
                <th className="px-8 py-5">Club</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-6 font-bold text-slate-900">{event.title}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{event.clubs?.name}</td>
                  <td className="px-8 py-6 text-sm text-slate-500">{event.event_date}</td>
                  <td className="px-8 py-6"><StatusBadge status={event.status} /></td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => updateStatus(event.id, 'approved')} title="Approve" className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle size={16}/></button>
                      <button onClick={() => updateStatus(event.id, 'hold')} title="Hold" className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all"><PauseCircle size={16}/></button>
                      <button onClick={() => updateStatus(event.id, 'cancelled')} title="Cancel" className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><X size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic">New Event</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <input 
                type="text" placeholder="Event Title" required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500"
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              />
              <select 
                required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                onChange={(e) => setNewEvent({...newEvent, club_id: e.target.value})}
              >
                <option value="">Select Club</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input 
                type="date" required
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
                onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
              />
              <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl mt-4 hover:bg-orange-500 transition-all">
                CREATE EVENT
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reuse your StatCard and StatusBadge components from the previous response...
function StatCard({ title, value, icon, color, bg, isAlert }: any) {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{title}</p>
        <h4 className={`text-4xl font-black ${isAlert && value > 0 ? 'text-orange-500 animate-pulse' : 'text-slate-900'}`}>{value}</h4>
        <div className={`absolute right-4 top-4 p-3 rounded-2xl ${bg} ${color}`}>
          {icon}
        </div>
      </div>
    );
  }
  
  function StatusBadge({ status }: { status: string }) {
    const styles: any = {
      approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
      pending: "bg-orange-50 text-orange-600 border-orange-100",
      cancelled: "bg-red-50 text-red-600 border-red-100",
      hold: "bg-amber-50 text-amber-600 border-amber-100"
    };
    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${styles[status]}`}>
        {status}
      </span>
    );
  }