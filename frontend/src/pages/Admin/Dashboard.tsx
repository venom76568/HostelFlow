import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { removeAuthToken, getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  LayoutDashboard, Users, AlertTriangle, CalendarRange, 
  UtensilsCrossed, Download, Search, X, ShieldCheck, KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type Meal = { id: string; date: string; breakfast: string; lunch: string; dinner: string; };
type Complaint = { id: string; student_name: string; category: string; description: string; status: string; image_url: string; created_at: string; };
type Leave = { id: string; student_name: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; };
type Notice = { id: string; title: string; content: string; created_at: string; };

export default function AdminDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Data State
  const [meals, setMeals] = useState<Meal[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  // Drawer State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  
  // Password State
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // New Meal Form
  const [date, setDate] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");

  // New Notice Form
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  // Edit States
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editNoticeTitle, setEditNoticeTitle] = useState("");
  const [editNoticeContent, setEditNoticeContent] = useState("");

  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealDate, setEditMealDate] = useState("");
  const [editBreakfast, setEditBreakfast] = useState("");
  const [editLunch, setEditLunch] = useState("");
  const [editDinner, setEditDinner] = useState("");

  const fetchData = async () => {
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [m, c, l, n] = await Promise.all([
        axios.get(`${API_URL}/meals/`, { headers }),
        axios.get(`${API_URL}/complaints/`, { headers }),
        axios.get(`${API_URL}/leaves/`, { headers }),
        axios.get(`${API_URL}/notices/`, { headers })
      ]);
      setMeals(m.data); setComplaints(c.data); setLeaves(l.data); setNotices(n.data);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateComplaint = async (id: string, status: string) => {
    try {
      await axios.patch(`${API_URL}/complaints/${id}/status`, { status }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Status updated");
      fetchData();
      if (selectedComplaint?.id === id) setSelectedComplaint(prev => prev ? {...prev, status} : null);
    } catch { toast.error("Update failed"); }
  };

  const handleUpdateLeave = async (id: string, status: string) => {
    try {
      await axios.patch(`${API_URL}/leaves/${id}/status`, { status }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success(`Leave ${status}`);
      fetchData();
    } catch { toast.error("Update failed"); }
  };

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/meals/`, { date, breakfast, lunch, dinner }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu created");
      setDate(""); setBreakfast(""); setLunch(""); setDinner("");
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to create menu"); }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/notices/`, { title: noticeTitle, content: noticeContent }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice posted");
      setNoticeTitle(""); setNoticeContent("");
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to post notice"); }
  };

  const handleEditNotice = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/notices/${id}`, { title: editNoticeTitle, content: editNoticeContent }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice updated");
      setEditingNoticeId(null);
      fetchData();
    } catch (error) { toast.error("Failed to update notice"); }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/notices/${id}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice deleted");
      fetchData();
    } catch (err: any) { toast.error("Failed to delete notice"); }
  };

  const handleEditMeal = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/meals/${id}`, { date: editMealDate, breakfast: editBreakfast, lunch: editLunch, dinner: editDinner }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu updated");
      setEditingMealId(null);
      fetchData();
    } catch (error) { toast.error("Failed to update menu"); }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu? All responses for this meal will also be deleted.")) return;
    try {
      await axios.delete(`${API_URL}/meals/${id}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu deleted");
      fetchData();
    } catch (error) { toast.error("Failed to delete menu"); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/auth/change-password`, { old_password: oldPassword, new_password: newPassword }, 
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      toast.success("Password updated successfully!");
      setPasswordModalOpen(false);
      setOldPassword(""); setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update password.");
    }
  };

  const handleExport = async (mealId: string) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/meals/${mealId}/export`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `meal_${mealId}_responses.csv`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success("Export downloaded");
    } catch (err) { toast.error("Export failed"); }
  };

  const handleLogout = () => { removeAuthToken(); navigate(`/login`); };

  // Metrics
  const openComplaints = complaints.filter(c => c.status !== "Resolved").length;
  const pendingLeaves = leaves.filter(l => l.status === "Pending").length;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="flex h-screen bg-[#0f172a] text-[#f1f5f9] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] border-r border-white/5 flex flex-col justify-between hidden md:flex">
        <div className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight mb-8">
            <LayoutDashboard className="text-blue-500"/> Admin Panel
          </h2>
          <nav className="space-y-2">
            <button className="w-full text-left px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all">Dashboard</button>
            <button onClick={() => setPasswordModalOpen(true)} className="w-full text-left px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all">Change Password</button>
          </nav>
        </div>
        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">W</div>
             <div>
                <p className="font-semibold text-sm">Warden</p>
                <p className="text-xs text-slate-400">{slug}</p>
             </div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 p-2 rounded flex items-center gap-2 text-xs text-green-400">
             <ShieldCheck className="w-4 h-4"/> Subscription: ACTIVE
          </div>
          <button onClick={handleLogout} className="w-full text-left px-2 py-1 text-xs text-red-400 hover:text-red-300">Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Header */}
            <header className="flex justify-between items-center md:hidden mb-4">
               <h1 className="text-xl font-bold">Admin Panel</h1>
               <button onClick={handleLogout} className="text-red-400 border border-red-500/30 px-3 py-1 rounded text-sm">Logout</button>
            </header>

            {/* Metric Cards */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <motion.div variants={itemVariants} className="bg-[#1e293b]/50 backdrop-blur-xl border border-yellow-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-yellow-500/50 transition-all">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Open Complaints</h3>
                  <div className="mt-2 flex items-center gap-4">
                     <AlertTriangle className="w-8 h-8 text-yellow-400" />
                     <span className="text-4xl font-bold font-mono text-white">{openComplaints}</span>
                  </div>
               </motion.div>
               <motion.div variants={itemVariants} className="bg-[#1e293b]/50 backdrop-blur-xl border border-blue-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Leaves Pending</h3>
                  <div className="mt-2 flex items-center gap-4">
                     <CalendarRange className="w-8 h-8 text-blue-400" />
                     <span className="text-4xl font-bold font-mono text-white">{pendingLeaves}</span>
                  </div>
               </motion.div>
            </motion.div>

            {/* Complex Grids */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Complaint Hub & Leaves */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Complaints Table */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/5">
                            <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500"/> Complaint Hub</h2>
                            <div className="relative self-end sm:self-auto">
                               <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                               <Input placeholder="Search..." className="bg-slate-900 border-white/10 pl-9 w-48 text-sm h-9"/>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-400 uppercase bg-black/20">
                                    <tr>
                                        <th className="px-6 py-3">Student</th>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complaints.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No complaints found.</td></tr>}
                                    {complaints.map(c => (
                                        <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                            <td className="px-6 py-3 font-medium" onClick={() => setSelectedComplaint(c)}>{c.student_name}</td>
                                            <td className="px-6 py-3" onClick={() => setSelectedComplaint(c)}><span className={`
                                                ${c.category === 'Food' ? 'text-orange-400' : c.category === 'Water' ? 'text-blue-400' : 'text-purple-400'}
                                            `}>{c.category}</span></td>
                                            <td className="px-6 py-3">
                                                <select 
                                                    value={c.status} 
                                                    onChange={(e) => handleUpdateComplaint(c.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`bg-slate-900/50 border rounded p-1 outline-none text-xs font-bold transition-all ${
                                                        c.status === 'Pending' ? 'border-yellow-500/50 text-yellow-400' : 
                                                        c.status === 'In_Progress' ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400' : 
                                                        'border-green-500/50 text-green-400'
                                                    }`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="In_Progress">In Progress</option>
                                                    <option value="Resolved">Resolved</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={() => setSelectedComplaint(c)} className="text-slate-400 hover:text-white text-xs underline">View Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pending Leaves */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                         <div className="p-4 border-b border-white/10 bg-white/5">
                            <h2 className="font-bold flex items-center gap-2"><CalendarRange className="w-5 h-5 text-blue-500"/> Leave Approvals</h2>
                        </div>
                        <div className="p-2 space-y-2">
                            {leaves.filter(l => l.status === "Pending").map(l => (
                                <div key={l.id} className="p-4 bg-black/20 rounded-lg flex justify-between items-center border border-white/5 hover:border-white/10 transition-colors">
                                    <div>
                                        <div className="font-bold text-sm">{l.student_name} <span className="text-xs text-slate-400 font-normal ml-2">{l.start_date} to {l.end_date}</span></div>
                                        <div className="text-xs text-slate-400 mt-1">{l.reason}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateLeave(l.id, "Approved")} className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded text-xs hover:bg-green-500 hover:text-white transition-all">Approve</button>
                                        <button onClick={() => handleUpdateLeave(l.id, "Rejected")} className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded text-xs hover:bg-red-500 hover:text-white transition-all">Reject</button>
                                    </div>
                                </div>
                            ))}
                            {leaves.filter(l => l.status === "Pending").length === 0 && <div className="p-4 text-center text-sm text-slate-500">No pending leaves.</div>}
                        </div>
                    </div>
                </div>

                {/* Mess Manager Sidebar */}
                <div className="space-y-6">
                    {/* Notice Board */}
                    <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-purple-400">Notices Manager</h2>
                        <form onSubmit={handleCreateNotice} className="space-y-4 mb-6 pb-6 border-b border-white/10">
                            <div><Label className="text-xs text-slate-400">Title</Label><Input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Content</Label><textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} className="w-full bg-slate-900 border border-white/10 text-white p-2 rounded min-h-[80px]" required /></div>
                            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]">Post Notice</Button>
                        </form>
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-300">Recent Notices</h3>
                            {notices.map(n => (
                                <div key={n.id} className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-2 relative group">
                                    {editingNoticeId === n.id ? (
                                        <form onSubmit={(e) => handleEditNotice(n.id, e)} className="space-y-3 mt-2 mb-2 p-2 border border-purple-500/30 rounded bg-black/40">
                                            <Input value={editNoticeTitle} onChange={e => setEditNoticeTitle(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-sm" required placeholder="Title" />
                                            <textarea value={editNoticeContent} onChange={e => setEditNoticeContent(e.target.value)} className="w-full bg-slate-900 border border-white/10 text-white p-2 text-sm rounded min-h-[60px]" required placeholder="Content" />
                                            <div className="flex gap-2">
                                                <Button type="button" onClick={() => setEditingNoticeId(null)} className="h-7 text-xs flex-1 bg-slate-800 hover:bg-slate-700">Cancel</Button>
                                                <Button type="submit" className="h-7 text-xs flex-1 bg-purple-600 hover:bg-purple-500">Save</Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-sm text-purple-300 pr-12">{n.title}</div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 flex gap-2">
                                                    <button onClick={() => { setEditingNoticeId(n.id); setEditNoticeTitle(n.title); setEditNoticeContent(n.content); }} className="text-blue-400 hover:text-blue-300 text-xs underline">Edit</button>
                                                    <button onClick={() => handleDeleteNotice(n.id)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-300 line-clamp-2">{n.content}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {notices.length === 0 && <div className="text-xs text-slate-500">No notices posted.</div>}
                        </div>
                    </div>
                    <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6"><UtensilsCrossed className="text-orange-400 w-5 h-5"/> Mess Manager</h2>
                        <form onSubmit={handleCreateMeal} className="space-y-4 mb-6 pb-6 border-b border-white/10">
                            <div><Label className="text-xs text-slate-400">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-900 border-white/10 bg-opacity-50" required/></div>
                            <div><Label className="text-xs text-slate-400">Breakfast</Label><Input value={breakfast} onChange={e => setBreakfast(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Lunch</Label><Input value={lunch} onChange={e => setLunch(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Dinner</Label><Input value={dinner} onChange={e => setDinner(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]">Publish Menu</Button>
                        </form>
                        
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-300">Scheduled Meals</h3>
                            {meals.map(m => (
                                <div key={m.id} className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-2 relative group">
                                    {editingMealId === m.id ? (
                                        <form onSubmit={(e) => handleEditMeal(m.id, e)} className="space-y-3 mt-2 mb-2 p-2 border border-orange-500/30 rounded bg-black/40">
                                             <Input type="date" value={editMealDate} onChange={e => setEditMealDate(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-sm" required />
                                             <Input value={editBreakfast} onChange={e => setEditBreakfast(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-sm" required placeholder="Breakfast" />
                                             <Input value={editLunch} onChange={e => setEditLunch(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-sm" required placeholder="Lunch" />
                                             <Input value={editDinner} onChange={e => setEditDinner(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-sm" required placeholder="Dinner" />
                                             <div className="flex gap-2">
                                                <Button type="button" onClick={() => setEditingMealId(null)} className="h-7 text-xs flex-1 bg-slate-800 hover:bg-slate-700">Cancel</Button>
                                                <Button type="submit" className="h-7 text-xs flex-1 bg-orange-600 hover:bg-orange-500">Save</Button>
                                             </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="font-mono text-xs text-blue-400 flex justify-between items-center pr-12">
                                                {m.date}
                                                <button onClick={() => handleExport(m.id)} className="text-neon-green text-[10px] flex items-center gap-1 border border-green-400 text-green-400 px-2 py-0.5 rounded shadow-[0_0_5px_rgba(34,197,94,0.5)] hover:bg-green-400 hover:text-black transition-all">
                                                    <Download className="w-3 h-3"/> EXPORT
                                                </button>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-2">
                                                <button onClick={() => { setEditingMealId(m.id); setEditMealDate(m.date); setEditBreakfast(m.breakfast); setEditLunch(m.lunch); setEditDinner(m.dinner); }} className="text-blue-400 hover:text-blue-300 text-xs underline">Edit</button>
                                                <button onClick={() => handleDeleteMeal(m.id)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4"/></button>
                                            </div>
                                            <div className="text-xs text-slate-300">🌞 {m.breakfast}</div>
                                            <div className="text-xs text-slate-300">🍛 {m.lunch}</div>
                                            <div className="text-xs text-slate-300">🌙 {m.dinner}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </main>

      {/* Drawer / Sheet for Complaint Details */}
      <AnimatePresence>
        {selectedComplaint && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
               onClick={() => setSelectedComplaint(null)}
            />
            <motion.div 
               initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
               className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1e293b] border-l border-white/10 z-50 p-6 shadow-2xl overflow-y-auto"
            >
               <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                   <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="text-yellow-400" /> Ticket Details</h2>
                   <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white"><X /></button>
               </div>
               
               <div className="space-y-6">
                   <div>
                       <Label className="text-slate-400 text-xs uppercase tracking-widest">Student</Label>
                       <p className="font-bold text-lg">{selectedComplaint.student_name}</p>
                   </div>
                   <div className="flex gap-4">
                       <div>
                           <Label className="text-slate-400 text-xs uppercase tracking-widest">Category</Label>
                           <p className="font-semibold text-blue-400">{selectedComplaint.category}</p>
                       </div>
                       <div>
                           <Label className="text-slate-400 text-xs uppercase tracking-widest">Date</Label>
                           <p className="font-mono text-sm">{new Date(selectedComplaint.created_at).toLocaleDateString()}</p>
                       </div>
                   </div>
                   <div>
                       <Label className="text-slate-400 text-xs uppercase tracking-widest">Description</Label>
                       <div className="bg-black/20 p-4 rounded-lg border border-white/5 mt-1 text-sm text-slate-300 leading-relaxed">
                          {selectedComplaint.description}
                       </div>
                   </div>
                   
                   {selectedComplaint.image_url && (
                       <div>
                           <Label className="text-slate-400 text-xs uppercase tracking-widest block mb-2">Attachment</Label>
                            <a href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${selectedComplaint.image_url}`} target="_blank" rel="noreferrer" className="block w-full rounded-lg overflow-hidden border border-white/10 hover:border-blue-500 transition-colors">
                                <img src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${selectedComplaint.image_url}`} alt="Evidence" className="w-full h-48 object-cover opacity-80 hover:opacity-100 transition-opacity" />
                           </a>
                           <p className="text-xs text-slate-500 mt-2 text-center">Click image to view full size</p>
                       </div>
                   )}

                   <div className="pt-6 border-t border-white/10">
                       <Label className="text-slate-400 text-xs uppercase tracking-widest block mb-2">Update Status</Label>
                       <select 
                            value={selectedComplaint.status} 
                            onChange={(e) => handleUpdateComplaint(selectedComplaint.id, e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Pending">Pending</option>
                            <option value="In_Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                   </div>
               </div>
            </motion.div>
          </>
        )}
        {isPasswordModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   className="w-full max-w-md bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound className="text-blue-400"/> Change Password</h3>
                            <button onClick={() => setPasswordModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
                                <Label className="text-slate-300">Old Password</Label>
                                <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="bg-slate-900 border-white/10 text-white" required />
                            </motion.div>
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
                                <Label className="text-slate-300">New Password</Label>
                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-slate-900 border-white/10 text-white" required />
                            </motion.div>
                            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                Update Password
                            </motion.button>
                        </form>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
