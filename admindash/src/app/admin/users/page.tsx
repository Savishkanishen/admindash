'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, Crown, Loader2, Search, 
  Trash2, PlusCircle, UserPlus, X, Mail, User as UserIcon
} from 'lucide-react';

// --- TYPES ---
interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'club_representative' | 'student';
}

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [userMemberships, setUserMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for New User
  const [newUser, setNewUser] = useState({ full_name: '', role: 'student' });

  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch all profiles, clubs, and the junction table (memberships)
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');
    const { data: clubList } = await supabase.from('clubs').select('id, name');
    const { data: memberships } = await supabase.from('club_members').select('*, clubs(name)');

    if (profiles) setUsers(profiles);
    if (clubList) setClubs(clubList || []);
    if (memberships) setUserMemberships(memberships);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    
    // Set up Realtime listener for memberships and profiles
    const channel = supabase.channel('user-hub-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // --- ACTIONS ---

  // 1. Create a new profile manually
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').insert([newUser]);
    if (error) alert(error.message);
    else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  // 2. Change Global System Role (Admin/Rep/Student)
  const updateRole = async (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert("Role Update Failed");
      fetchData();
    }
  };

  // 3. Assign Leadership for a specific club
  const assignAsLeader = async (userId: string, clubId: string) => {
    // A: Demote any current leader for this specific club
    await supabase.from('club_members').update({ is_leader: false }).eq('club_id', clubId);

    // B: Promote this user to leader in that club
    await supabase.from('club_members').update({ is_leader: true }).match({ profile_id: userId, club_id: clubId });

    // C: Sync system role to Representative
    await updateRole(userId, 'club_representative');
    fetchData();
  };

  // 4. Add user to a club (as a regular member)
  const addToClub = async (userId: string, clubId: string) => {
    if (!clubId) return;
    const { error } = await supabase.from('club_members').insert([{ profile_id: userId, club_id: clubId, is_leader: false }]);
    if (error) alert("User already in this club");
    else fetchData();
  };

  // 5. Remove user from a specific club
  const removeMember = async (userId: string, clubId: string) => {
    await supabase.from('club_members').delete().match({ profile_id: userId, club_id: clubId });
    fetchData();
  };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FE] p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & STATS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">User Directory</h1>
            <div className="flex gap-4 mt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total: {users.length}</span>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Leaders: {userMemberships.filter(m => m.is_leader).length}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                placeholder="Search..."
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <UserPlus size={20} /> <span className="hidden md:inline">Add User</span>
            </button>
          </div>
        </div>

        {/* USER GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-indigo-100 group">
              
              {/* Card Header: Avatar & Role Toggles */}
              <div className="flex justify-between items-start mb-8">
                <div className="h-16 w-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg">
                  {user.full_name?.charAt(0)}
                </div>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <RoleBtn active={user.role === 'admin'} icon={<ShieldCheck size={16}/>} onClick={() => updateRole(user.id, 'admin')} color="text-indigo-600" />
                  <RoleBtn active={user.role === 'club_representative'} icon={<Crown size={16}/>} onClick={() => updateRole(user.id, 'club_representative')} color="text-amber-600" />
                  <RoleBtn active={user.role === 'student'} icon={<UserIcon size={16}/>} onClick={() => updateRole(user.id, 'student')} color="text-slate-600" />
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">{user.full_name}</h3>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-6">{user.role.replace('_', ' ')}</p>

              {/* MEMBERSHIPS AREA */}
              <div className="space-y-3 mb-8">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Club Memberships</p>
                {userMemberships.filter(m => m.profile_id === user.id).length > 0 ? (
                  userMemberships.filter(m => m.profile_id === user.id).map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl group/item">
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-700">{m.clubs.name}</span>
                         {m.is_leader && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {/* Assign Leader Button */}
                        {!m.is_leader && (
                          <button 
                            onClick={() => assignAsLeader(user.id, m.club_id)}
                            className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-600"
                            title="Promote to Leader"
                          >
                            <Crown size={14} />
                          </button>
                        )}
                        <button onClick={() => removeMember(user.id, m.club_id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-300">No active clubs</p>
                )}
              </div>

              {/* ASSIGNMENT DROPDOWN */}
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-slate-50 border-none rounded-xl text-xs font-bold p-3 outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer"
                  onChange={(e) => addToClub(user.id, e.target.value)}
                  value=""
                >
                  <option value="">+ Add to Organization</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: CREATE USER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">Create Profile</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Full Name</label>
                <input 
                  required className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold mt-1"
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Initial Role</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold mt-1"
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                >
                  <option value="student">Student</option>
                  <option value="club_representative">Club Representative</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs">
                Confirm Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Role Buttons
function RoleBtn({ active, icon, onClick, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 rounded-xl transition-all ${active ? `bg-white shadow-sm ${color}` : 'text-slate-300 hover:text-slate-600'}`}
    >
      {icon}
    </button>
  );
}