'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  RotateCcw, CheckCircle2, ShieldAlert, Search, 
  Filter, MoreVertical, Users, Plus, X, Trash2, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';


interface ClubMember {
  is_leader: boolean;
  profiles: {
    full_name: string;
  } | null;
}

interface Club {
  id: string;
  name: string;
  description: string;
  status: 'approved' | 'suspended' | 'pending';
  created_at: string;
  club_members: ClubMember[];
  leader_name?: string; // We add this manually during processing
}


export default function ManageClubs() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newClub, setNewClub] = useState({ name: '', description: '', status: 'pending' });

const fetchClubs = useCallback(async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select(`
        *,
        club_members(
          is_leader,
          profiles(full_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      // 1. Cast the raw Supabase data to our Club interface array
      const rawData = data as unknown as Club[];

      // 2. Type the 'club' and 'm' parameters explicitly
      const processedClubs = rawData.map((club: Club) => {
        const leaderObj = club.club_members?.find((m: ClubMember) => m.is_leader === true);
        
        return {
          ...club,
          leader_name: leaderObj?.profiles?.full_name || 'No Leader Assigned'
        };
      });

      setClubs(processedClubs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClubs();

    // REAL-TIME: Listen for any changes to the clubs table
    const channel = supabase
      .channel('live-clubs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clubs' }, () => {
        fetchClubs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchClubs]);

  const updateClubStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('clubs').update({ status: newStatus }).eq('id', id);
    if (error) alert(error.message);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('clubs').insert([newClub]);
    if (error) alert(error.message);
    else {
      setIsModalOpen(false);
      setNewClub({ name: '', description: '', status: 'pending' });
    }
  };

  const deleteClub = async (id: string) => {
    if (!confirm("Are you sure? This will remove all members and events for this club.")) return;
    const { error } = await supabase.from('clubs').delete().eq('id', id);
    if (error) alert(error.message);
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-black" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-black uppercase italic">Club Management</h2>
            <p className="text-slate-500 mt-1 font-bold">
              Active Organizations: <span className="text-black">{clubs.length}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" placeholder="Search system..."
                className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-black outline-none w-full md:w-64 transition-all text-sm font-bold"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={18} /> Add Club
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="p-8 font-black text-slate-400 uppercase tracking-widest text-[10px]">Club & Leader</th>
                <th className="p-8 font-black text-slate-400 uppercase tracking-widest text-[10px]">Verification</th>
                <th className="p-8 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClubs.map((club) => (
                <tr key={club.id} className="group hover:bg-slate-50/30 transition-all">
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform">
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg leading-none mb-2">{club.name}</p>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-tighter flex items-center gap-1">
                           <Users size={12}/> Leader: {club.leader_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <StatusBadge status={club.status} />
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => updateClubStatus(club.id, 'approved')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle2 size={18} /></button>
                      <button onClick={() => updateClubStatus(club.id, 'suspended')} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><ShieldAlert size={18} /></button>
                      <button onClick={() => deleteClub(club.id)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-black hover:text-white transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CLUB MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl border border-white">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-black uppercase italic">Register Club</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleCreateClub} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Club Name</label>
                <input 
                  type="text" required
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold"
                  onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Description</label>
                <textarea 
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all font-bold"
                  onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                ></textarea>
              </div>
              <button className="w-full bg-black text-white font-black py-5 rounded-2xl mt-4 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-xs">
                Initialize Organization
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    approved: "bg-emerald-50 text-emerald-600 border-emerald-500/20",
    suspended: "bg-red-50 text-red-600 border-red-500/20",
    pending: "bg-amber-50 text-amber-600 border-amber-500/20"
  };
  return (
    <span className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest border-2 uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}