import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { removeAuthToken, getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, AlertTriangle, CalendarRange,
  UtensilsCrossed, Download, Search, X, ShieldCheck, KeyRound, Users,
  CheckCircle2, XCircle, Clock, TrendingUp, FileDown, Filter, ClipboardCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { ProgressBar } from "@/components/ui/progress-bar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type Meal = { id: string; date: string; breakfast: string; lunch: string; dinner: string; };
type Complaint = { id: string; student_name: string; category: string; description: string; status: string; image_url: string; created_at: string; };
type Leave = { id: string; student_name: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; };
type Notice = { id: string; title: string; content: string; created_at: string; };
type Student = { id: string; full_name: string; email: string; room_number: string; contact: string; };

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
  
  // Student Roster State
  const [students, setStudents] = useState<Student[]>([]);
  const [isStudentModalOpen, setStudentModalOpen] = useState(false);
  
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
  
  // Idempotency state
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [editMealDate, setEditMealDate] = useState("");
  const [editBreakfast, setEditBreakfast] = useState("");
  const [editLunch, setEditLunch] = useState("");
  const [editDinner, setEditDinner] = useState("");

  // Filter States
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Leave filter states
  const [leaveFilterStatus, setLeaveFilterStatus] = useState("All");
  const [leaveFilterDate, setLeaveFilterDate] = useState("");
  const [leaveSearchStudent, setLeaveSearchStudent] = useState("");

  const fetchData = async () => {
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [m, c, l, n, s] = await Promise.all([
        axios.get(`${API_URL}/meals/`, { headers }),
        axios.get(`${API_URL}/complaints/`, { headers }),
        axios.get(`${API_URL}/leaves/`, { headers }),
        axios.get(`${API_URL}/notices/`, { headers }),
        axios.get(`${API_URL}/users/students`, { headers })
      ]);
      setMeals(m.data); setComplaints(c.data); setLeaves(l.data); setNotices(n.data); setStudents(s.data);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplaintUpdate = async (id: string, newStatus: string) => {
    if (isProcessing === `complaint_${id}`) return;
    
    setIsProcessing(`complaint_${id}`);
    try {
      await axios.patch(`${API_URL}/complaints/${id}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Status updated");
      fetchData();
      if (selectedComplaint?.id === id) setSelectedComplaint(prev => prev ? {...prev, status: newStatus} : null);
    } catch { 
      toast.error("Update failed"); 
    } finally {
      setIsProcessing(null);
    }
  };

  const handleLeaveResponse = async (id: string, status: "Approved" | "Rejected") => {
    if (isProcessing === `leave_${id}`) return;
    
    setIsProcessing(`leave_${id}`);
    try {
      await axios.patch(`${API_URL}/leaves/${id}/status`, { status }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success(`Leave ${status}`);
      fetchData();
    } catch { 
      toast.error("Failed to update leave request"); 
    } finally {
      setIsProcessing(null);
    }
  };

  const handleMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing === "meal_submit") return;

    setIsProcessing("meal_submit");
    try {
      await axios.post(`${API_URL}/meals/`, { date, breakfast, lunch, dinner }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu created");
      setDate(""); setBreakfast(""); setLunch(""); setDinner("");
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to create menu"); }
    finally {
      setIsProcessing(null);
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing === "createNotice") return;

    setIsProcessing("createNotice");
    try {
      await axios.post(`${API_URL}/notices/`, { title: noticeTitle, content: noticeContent }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice posted");
      setNoticeTitle(""); setNoticeContent("");
      fetchData();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Failed to post notice"); }
    finally {
      setIsProcessing(null);
    }
  };

  const handleEditNotice = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing === "editNotice") return;

    setIsProcessing("editNotice");
    try {
      await axios.put(`${API_URL}/notices/${id}`, { title: editNoticeTitle, content: editNoticeContent }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice updated");
      setEditingNoticeId(null);
      fetchData();
    } catch { toast.error("Failed to update notice"); }
    finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/notices/${id}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Notice deleted");
      fetchData();
    } catch { toast.error("Failed to delete notice"); }
  };

  const handleEditMeal = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing === "meal_submit") return;

    setIsProcessing("meal_submit");
    try {
      await axios.put(`${API_URL}/meals/${id}`, { date: editMealDate, breakfast: editBreakfast, lunch: editLunch, dinner: editDinner }, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu updated");
      setEditingMealId(null);
      fetchData();
    } catch {
      toast.error("Failed to save meal.");
    } finally {
        setIsProcessing(null);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu? All responses for this meal will also be deleted.")) return;
    try {
      await axios.delete(`${API_URL}/meals/${id}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
      toast.success("Menu deleted");
      fetchData();
    } catch { toast.error("Failed to delete menu"); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing === "passwordChange") return;

    setIsProcessing("passwordChange");
    try {
      await axios.post(`${API_URL}/auth/change-password`, { old_password: oldPassword, new_password: newPassword }, 
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      toast.success("Password updated successfully!");
      setPasswordModalOpen(false);
      setOldPassword(""); setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setIsProcessing(null);
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
    } catch (err: any) { toast.error(err.response?.data?.detail || "Export failed"); }
  };

  const handleExportStudents = () => {
    const headers = ["ID", "Name", "Email", "Room", "Contact"];
    const rows = students.map(s => [s.id, s.full_name, s.email, s.room_number || "N/A", s.contact || "N/A"]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', 'students_roster.csv');
    document.body.appendChild(link); link.click(); link.remove();
  };

  const handleLogout = () => { removeAuthToken(); navigate(`/login`); };

  // Metrics
  const openComplaints = complaints.filter(c => c.status !== "Resolved").length;
  const pendingLeaves = leaves.filter(l => l.status === "Pending").length;

  const filteredComplaints = complaints.filter(c => {
    let match = true;
    if (filterStatus !== "All" && c.status !== filterStatus) match = false;
    if (filterCategory !== "All" && c.category !== filterCategory) match = false;
    if (filterDate && !c.created_at.startsWith(filterDate)) match = false;
    if (searchTerm && !c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.description.toLowerCase().includes(searchTerm.toLowerCase())) match = false;
    return match;
  });

  // ─── Leave analytics ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const startOfWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  const leavesToday    = leaves.filter(l => l.start_date === today).length;
  const leavesThisWeek = leaves.filter(l => l.start_date >= startOfWeek).length;
  const leavesPending  = leaves.filter(l => l.status === "Pending").length;

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (leaveFilterStatus !== "All" && l.status !== leaveFilterStatus) return false;
      if (leaveFilterDate && !l.start_date.startsWith(leaveFilterDate)) return false;
      if (leaveSearchStudent && !l.student_name?.toLowerCase().includes(leaveSearchStudent.toLowerCase())) return false;
      return true;
    });
  }, [leaves, leaveFilterStatus, leaveFilterDate, leaveSearchStudent]);

  // Group filtered leaves by start_date
  const groupedLeaves = useMemo(() => {
    const groups: Record<string, typeof leaves> = {};
    for (const l of filteredLeaves) {
      const key = l.start_date || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }
    // Return sorted descending
    return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filteredLeaves]);

  const handleExportLeaves = async () => {
    try {
      const token = getAuthToken();
      const params: Record<string, string> = {};
      if (leaveFilterStatus !== "All") params.status_filter = leaveFilterStatus;
      if (leaveFilterDate) params.start_date = leaveFilterDate;
      const response = await axios.get(`${API_URL}/leaves/export`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leaves_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Leave records exported!");
    } catch { toast.error("Export failed."); }
  };

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
            <button onClick={() => navigate(`/${slug}/admin/attendance`)} className="w-full text-left px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"><ClipboardCheck className="w-4 h-4" />Attendance</button>
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
               <div className="flex items-center gap-2">
                  <button onClick={() => setPasswordModalOpen(true)} className="text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-sm" title="Change Password"><KeyRound className="w-4 h-4" /></button>
                  <button onClick={handleLogout} className="text-red-400 border border-red-500/30 px-3 py-1 rounded text-sm">Logout</button>
               </div>
            </header>

            {/* Metric Cards */}
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
               <motion.div variants={itemVariants} className="bg-[#1e293b]/50 backdrop-blur-xl border border-yellow-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-yellow-500/50 transition-all">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Open Complaints</h3>
                  <div className="mt-2 flex items-center gap-4">
                     <AlertTriangle className="w-8 h-8 text-yellow-400" />
                     <span className="text-4xl font-bold font-mono text-white">{openComplaints}</span>
                  </div>
               </motion.div>
               <motion.div variants={itemVariants} className="bg-[#1e293b]/50 backdrop-blur-xl border border-blue-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-all flex flex-col justify-between">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Leaves Pending</h3>
                  <div className="mt-2 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                         <CalendarRange className="w-8 h-8 text-blue-400" />
                         <span className="text-4xl font-bold font-mono text-white">{pendingLeaves}</span>
                     </div>
                  </div>
               </motion.div>
               <motion.div variants={itemVariants} onClick={() => setStudentModalOpen(true)} className="bg-[#1e293b]/50 backdrop-blur-xl border border-purple-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all cursor-pointer flex flex-col justify-between">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Connected Students</h3>
                  <div className="mt-2 flex items-center gap-4">
                     <Users className="w-8 h-8 text-purple-400" />
                     <span className="text-4xl font-bold font-mono text-white">{students.length}</span>
                  </div>
               </motion.div>
               <motion.div variants={itemVariants} onClick={() => navigate(`/${slug}/admin/attendance`)} className="bg-[#1e293b]/50 backdrop-blur-xl border border-green-500/20 p-6 rounded-xl shadow-lg relative overflow-hidden group hover:border-green-500/50 transition-all cursor-pointer flex flex-col justify-between">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"/>
                  <h3 className="text-slate-400 text-sm font-medium">Attendance</h3>
                  <div className="mt-2 flex items-center gap-4">
                     <ClipboardCheck className="w-8 h-8 text-green-400" />
                     <span className="text-lg font-semibold text-white">Mark Attendance →</span>
                  </div>
               </motion.div>
            </motion.div>

            {/* Complex Grids */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Complaint Hub & Leaves */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Complaints Table */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-white/5">
                            <h2 className="font-bold flex items-center gap-2 whitespace-nowrap"><AlertTriangle className="w-5 h-5 text-yellow-500"/> Complaint Hub</h2>
                            <div className="flex flex-wrap gap-2 items-center">
                               <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-900 border border-white/10 text-xs p-2 rounded outline-none text-slate-300 h-8">
                                  <option value="All">All Status</option>
                                  <option value="Pending">Pending</option>
                                  <option value="In_Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                               </select>
                               <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-900 border border-white/10 text-xs p-2 rounded outline-none text-slate-300 h-8">
                                  <option value="All">All Categories</option>
                                  <option value="Food">Food</option>
                                  <option value="Water">Water</option>
                                  <option value="Electricity">Electricity</option>
                                  <option value="Cleaning">Cleaning</option>
                                  <option value="Other">Other</option>
                               </select>
                               <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-slate-900 border-white/10 h-8 text-xs w-32" />
                               <div className="relative">
                                  <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="bg-slate-900 border-white/10 pl-9 w-40 h-8 text-xs"/>
                               </div>
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
                                    {filteredComplaints.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No complaints found.</td></tr>}
                                    {filteredComplaints.map(c => (
                                        <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                            <td className="px-6 py-3 font-medium" onClick={() => setSelectedComplaint(c)}>{c.student_name}</td>
                                            <td className="px-6 py-3" onClick={() => setSelectedComplaint(c)}><span className={`
                                                ${c.category === 'Food' ? 'text-orange-400' : c.category === 'Water' ? 'text-blue-400' : 'text-purple-400'}
                                            `}>{c.category}</span></td>
                                            <td className="px-6 py-3">
                                                <Select disabled={isProcessing === `complaint_${c.id}`} value={c.status} onValueChange={(val: string) => handleComplaintUpdate(c.id, val)}>
                                                    <SelectTrigger className={`bg-slate-900/50 border rounded p-1 outline-none text-xs font-bold transition-all ${
                                                        c.status === 'Pending' ? 'border-yellow-500/50 text-yellow-400' : 
                                                        c.status === 'In_Progress' ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] text-blue-400' : 
                                                        'border-green-500/50 text-green-400'
                                                    } ${isProcessing === `complaint_${c.id}` ? "opacity-50 cursor-not-allowed" : ""}`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                        <SelectItem value="Pending">Pending</SelectItem>
                                                        <SelectItem value="In_Progress">In Progress</SelectItem>
                                                        <SelectItem value="Resolved">Resolved</SelectItem>
                                                    </SelectContent>
                                                </Select>
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

                    {/* ═══════════════════════════════════════════════ */}
                    {/* LEAVE MANAGEMENT PANEL                          */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        {/* Panel Header */}
                        <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <h2 className="font-bold flex items-center gap-2 whitespace-nowrap">
                                <CalendarRange className="w-5 h-5 text-blue-500"/> Leave Management
                            </h2>
                            <button
                                onClick={handleExportLeaves}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition-all font-bold"
                            >
                                <FileDown className="w-3.5 h-3.5" /> Export CSV
                            </button>
                        </div>

                        {/* Analytics Row */}
                        <div className="grid grid-cols-3 gap-0 border-b border-white/10">
                            <div className="p-4 text-center border-r border-white/10">
                                <div className="text-2xl font-bold font-mono text-blue-400">{leavesToday}</div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Today</div>
                            </div>
                            <div className="p-4 text-center border-r border-white/10">
                                <div className="text-2xl font-bold font-mono text-purple-400">{leavesThisWeek}</div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3"/> This Week</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold font-mono text-amber-400">{leavesPending}</div>
                                <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Filter className="w-3 h-3"/> Pending</div>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="p-3 border-b border-white/10 bg-black/10 flex flex-wrap gap-2 items-center">
                            <select
                                value={leaveFilterStatus}
                                onChange={e => setLeaveFilterStatus(e.target.value)}
                                className="bg-slate-900 border border-white/10 text-xs p-2 rounded outline-none text-slate-300 h-8"
                            >
                                <option value="All">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                            <Input
                                type="date"
                                value={leaveFilterDate}
                                onChange={e => setLeaveFilterDate(e.target.value)}
                                className="bg-slate-900 border-white/10 h-8 text-xs w-32"
                                title="Filter by Start Date"
                            />
                            <div className="relative flex-1 min-w-[140px]">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                                <Input
                                    value={leaveSearchStudent}
                                    onChange={e => setLeaveSearchStudent(e.target.value)}
                                    placeholder="Search student..."
                                    className="bg-slate-900 border-white/10 pl-8 h-8 text-xs"
                                />
                            </div>
                            {(leaveFilterStatus !== "All" || leaveFilterDate || leaveSearchStudent) && (
                                <button
                                    onClick={() => { setLeaveFilterStatus("All"); setLeaveFilterDate(""); setLeaveSearchStudent(""); }}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-white/10 rounded px-2 h-8"
                                >
                                    <X className="w-3 h-3"/> Clear
                                </button>
                            )}
                        </div>

                        {/* Date-Grouped Table */}
                        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                            {groupedLeaves.length === 0 && (
                                <div className="p-8 text-center text-sm text-slate-500">No leave records found.</div>
                            )}
                            {groupedLeaves.map(([date, groupLeaves]) => (
                                <motion.div
                                    key={date}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                	className=""
                                >
                                    {/* Date Group Header */}
                                    <div className="px-4 py-2 bg-slate-800/60 text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                        <CalendarRange className="w-3.5 h-3.5" />
                                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                        <span className="text-slate-600 font-normal normal-case">({groupLeaves.length} record{groupLeaves.length !== 1 ? "s" : ""})</span>
                                    </div>

                                    {/* Rows */}
                                    {groupLeaves.map(l => (
                                        <div key={l.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5 hover:bg-white/5 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm text-slate-200 truncate">{l.student_name || "Unknown"}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    <span className="font-mono">{l.start_date}</span>
                                                    {l.end_date && l.end_date !== l.start_date && (
                                                        <span className="font-mono"> → {l.end_date}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5 truncate" title={l.reason}>{l.reason}</div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {/* Status Badge */}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                                                    l.status === "Pending"  ? "border-amber-500/50 text-amber-400 bg-amber-500/10" :
                                                    l.status === "Approved" ? "border-green-500/50 text-green-400 bg-green-500/10" :
                                                    "border-red-500/50 text-red-400 bg-red-500/10"
                                                }`}>{l.status}</span>

                                                {/* Action Buttons — only for Pending */}
                                                {l.status === "Pending" && (
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            disabled={isProcessing === `leave_${l.id}`}
                                                            onClick={() => handleLeaveResponse(l.id, "Approved")}
                                                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-semibold transition-all ${
                                                                isProcessing === `leave_${l.id}` ? "bg-green-600/40 cursor-not-allowed text-green-400" : "bg-green-600 hover:bg-green-500 text-white"
                                                            }`}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> Approve
                                                        </button>
                                                        <button
                                                            disabled={isProcessing === `leave_${l.id}`}
                                                            onClick={() => handleLeaveResponse(l.id, "Rejected")}
                                                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-semibold transition-all ${
                                                                isProcessing === `leave_${l.id}` ? "bg-red-600/40 cursor-not-allowed text-red-400" : "bg-red-600 hover:bg-red-500 text-white"
                                                            }`}
                                                        >
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mess Manager Sidebar */}
                <div className="space-y-6">
                    {/* Notice Board */}
                    <div className="bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-purple-400">Notices Manager</h2>
                        <form onSubmit={handleNoticeSubmit} className="space-y-4 mb-6 pb-6 border-b border-white/10">
                            <div><Label className="text-xs text-slate-400">Title</Label><Input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Content</Label><textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} className="w-full bg-slate-900 border border-white/10 text-white p-2 rounded min-h-[80px]" required /></div>
                            <Button type="submit" disabled={isProcessing === "createNotice"} className={`w-full text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ${isProcessing === "createNotice" ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-500"}`}>
                                {isProcessing === "createNotice" ? "Posting..." : "Post Notice"}
                            </Button>
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
                                                <Button type="submit" disabled={isProcessing === "editNotice"} className={`h-7 text-xs flex-1 text-white ${isProcessing === "editNotice" ? "bg-purple-600/50 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-500"}`}>
                                                    {isProcessing === "editNotice" ? "Saving..." : "Save"}
                                                </Button>
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
                        <form onSubmit={handleMealSubmit} className="space-y-4 mb-6 pb-6 border-b border-white/10">
                            <div><Label className="text-xs text-slate-400">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-900 border-white/10 bg-opacity-50" required/></div>
                            <div><Label className="text-xs text-slate-400">Breakfast</Label><Input value={breakfast} onChange={e => setBreakfast(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Lunch</Label><Input value={lunch} onChange={e => setLunch(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <div><Label className="text-xs text-slate-400">Dinner</Label><Input value={dinner} onChange={e => setDinner(e.target.value)} className="bg-slate-900 border-white/10" required /></div>
                            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} type="submit" disabled={isProcessing === "meal_submit"} className={`w-full py-2 text-white font-bold rounded transition-all ${isProcessing === "meal_submit" ? "bg-amber-600/50 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]"}`}>
                                {isProcessing === "meal_submit" ? "Saving..." : (editingMealId ? "Update Meal" : "Add Meal")}
                            </motion.button>
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
                                                {new Date(m.date) <= new Date() ? (
                                                    <button onClick={() => handleExport(m.id)} className="text-neon-green text-[10px] flex items-center gap-1 border border-green-400 text-green-400 px-2 py-0.5 rounded shadow-[0_0_5px_rgba(34,197,94,0.5)] hover:bg-green-400 hover:text-black transition-all">
                                                        <Download className="w-3 h-3"/> EXPORT
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 cursor-not-allowed" title="Export locked until meal date">
                                                        <Download className="w-3 h-3"/> LOCKED
                                                    </span>
                                                )}
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
                            onChange={(e) => handleComplaintUpdate(selectedComplaint.id, e.target.value)}
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
                            <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} type="submit" disabled={isProcessing === "passwordChange"} className={`w-full py-2 text-white font-bold rounded ${isProcessing === "passwordChange" ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"}`}>
                                {isProcessing === "passwordChange" ? "Updating..." : "Update Password"}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>
            </div>
        )}
        {isStudentModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   className="w-full max-w-3xl bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                >
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="text-blue-400"/> Registered Students Roster</h3>
                        <div className="flex gap-4 items-center">
                            <button onClick={handleExportStudents} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded transition-all font-bold">
                                <Download className="w-3 h-3" /> CSV
                            </button>
                            <button onClick={() => setStudentModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-black/20 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Student Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Room / Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No students registered yet.</td></tr>}
                                {students.map(s => (
                                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-3 font-medium text-slate-200">{s.full_name}</td>
                                        <td className="px-6 py-3 text-slate-400">{s.email}</td>
                                        <td className="px-6 py-3 text-slate-400 text-xs">
                                            {s.room_number ? <div>Room: {s.room_number}</div> : null}
                                            {s.contact ? <div>Ph: {s.contact}</div> : null}
                                            {!s.room_number && !s.contact && "N/A"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
