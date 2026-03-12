import { useEffect, useState } from "react";
import { /* useParams, */ useNavigate } from "react-router-dom";
import { removeAuthToken, getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, AlertTriangle, CalendarRange, X, Check, UtensilsCrossed, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type Meal = { id: string; date: string; breakfast: string; lunch: string; dinner: string; is_edited?: boolean; };
type Notice = { id: string; title: string; content: string; created_at: string; is_edited?: boolean; };
type MealResponse = { meal_id: string; breakfast_status?: string; lunch_status?: string; dinner_status?: string; };
type Complaint = { id: string; category: string; description: string; status: string; created_at: string; };
type Leave = { id: string; start_date: string; end_date: string; reason: string; status: string; created_at: string; };

export default function StudentDashboard() {
  //const { slug } = useParams();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [myResponses, setMyResponses] = useState<Record<string, MealResponse>>({});
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  
  // Modals state
  const [isComplaintModalOpen, setComplaintModalOpen] = useState(false);
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [activeMealGlow, setActiveMealGlow] = useState<string | null>(null);

  // Forms
  const [compCategory, setCompCategory] = useState("Food");
  const [compDesc, setCompDesc] = useState("");
  const [compImage, setCompImage] = useState<File | null>(null);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const fetchData = async () => {
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, nRes, rRes, cRes, lRes] = await Promise.all([
        axios.get(`${API_URL}/meals/`, { headers }),
        axios.get(`${API_URL}/notices/`, { headers }),
        axios.get(`${API_URL}/meals/my-responses`, { headers }),
        axios.get(`${API_URL}/complaints/`, { headers }),
        axios.get(`${API_URL}/leaves/`, { headers })
      ]);
      setMeals(mRes.data);
      setNotices(nRes.data);
      setMyComplaints(cRes.data);
      setMyLeaves(lRes.data);
      
      const respMap: Record<string, MealResponse> = {};
      rRes.data.forEach((r: MealResponse) => respMap[r.meal_id] = r);
      setMyResponses(respMap);
    } catch (err: any) {
       if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResponse = async (mealId: string, mealType: "breakfast" | "lunch" | "dinner", status: "Having" | "Skipping") => {
      setActiveMealGlow(`${mealId}-${mealType}-${status}`);
      try {
           const token = getAuthToken();
           await axios.post(`${API_URL}/meals/${mealId}/respond`, { meal_type: mealType, status }, { headers: { Authorization: `Bearer ${token}` } });
           toast.success(`Marked as ${status} for ${mealType}`);
           
           // Optimistically update
           setMyResponses(prev => ({
             ...prev,
             [mealId]: { ...prev[mealId], meal_id: mealId, [`${mealType}_status`]: status }
           }));
           
           setTimeout(() => setActiveMealGlow(null), 1000);
      } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to record response.");
          setActiveMealGlow(null);
      }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("category", compCategory);
      formData.append("description", compDesc);
      if (compImage) formData.append("image", compImage);

      await axios.post(`${API_URL}/complaints/`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Complaint submitted!");
      setComplaintModalOpen(false);
      setCompDesc(""); setCompImage(null);
      fetchData();
    } catch {
      toast.error("Failed to submit complaint.");
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      await axios.post(`${API_URL}/leaves/`, { start_date: leaveStart, end_date: leaveEnd, reason: leaveReason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Leave requested!");
      setLeaveModalOpen(false);
      setLeaveStart(""); setLeaveEnd(""); setLeaveReason("");
      fetchData();
    } catch {
      toast.error("Failed to request leave.");
    }
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

  const handleLogout = () => {
    removeAuthToken();
    navigate(`/login`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] font-sans pb-10">
      
      {/* Removed Hardcoded Top Banner */}

      <div className="max-w-md mx-auto p-4 space-y-6 mt-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="text-blue-400 w-6 h-6" /> Welcome
            </h1>
            <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => setPasswordModalOpen(true)}>Password</Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400" onClick={handleLogout}>Logout</Button>
            </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
               <Card className="bg-slate-800/20 backdrop-blur-xl border border-blue-500/30 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all" onClick={() => setComplaintModalOpen(true)}>
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-blue-400">
                      <AlertTriangle className="w-8 h-8" />
                      <span className="font-semibold text-sm">File Complaint</span>
                  </CardContent>
               </Card>
            </motion.div>
            <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
               <Card className="bg-slate-800/20 backdrop-blur-xl border border-green-500/30 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all" onClick={() => setLeaveModalOpen(true)}>
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-green-400">
                      <CalendarRange className="w-8 h-8" />
                      <span className="font-semibold text-sm">Request Leave</span>
                  </CardContent>
               </Card>
            </motion.div>
        </div>

        {/* Notice Board */}
        {notices.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(168,85,247,0.1)] mb-6">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-purple-400 uppercase tracking-widest">
              Announcements
            </h2>
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n.id} className="bg-black/30 p-3 rounded-lg border border-white/5 relative">
                  <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                      {n.title}
                      {n.is_edited && <span className="px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[9px] uppercase tracking-widest leading-none">Edited</span>}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Meals */}
        <div>
           <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><UtensilsCrossed className="w-5 h-5"/>Meals</h2>
           {meals.length === 0 && <div className="text-slate-500 italic p-4 text-center">No meals found for today.</div>}
           {meals.slice(0,1).map((meal) => (
             <Card key={meal.id} className="bg-slate-800/20 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-slate-800/40 font-mono text-center text-slate-300 flex items-center justify-center gap-2">
                    {meal.date}
                    {meal.is_edited && <span className="px-1.5 py-0.5 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[9px] uppercase tracking-widest font-sans leading-none">Edited</span>}
                </div>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-6">
                        {(['breakfast', 'lunch', 'dinner'] as const).map(type => {
                            const val = meal[type];
                            const curStatus = myResponses[meal.id]?.[`${type}_status` as keyof MealResponse];
                            
                            return (
                                <div key={type} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                    <div className="text-center">
                                        <span className={`text-xs font-bold uppercase tracking-widest ${
                                            type === 'breakfast' ? 'text-orange-400' :
                                            type === 'lunch' ? 'text-blue-400' : 'text-purple-400'
                                        }`}>{type}</span>
                                        <div className="text-lg font-medium text-white mt-1">{val}</div>
                                    </div>
                                    
                                    {curStatus ? (
                                        <div className={`text-center text-xs font-bold p-2 rounded border ${
                                            curStatus === 'Having' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 
                                            'bg-red-500/10 text-red-500 border-red-500/30'
                                        }`}>
                                            ALREADY VOTED: {curStatus.toUpperCase()}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <motion.button 
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleResponse(meal.id, type, "Having")}
                                                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${activeMealGlow === `${meal.id}-${type}-Having` ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-green-500/30 hover:bg-green-500/10 text-green-400'}`}
                                            >
                                                <Check className="w-4 h-4" /> <span className="text-xs font-bold">HAVING</span>
                                            </motion.button>
                                            <motion.button 
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleResponse(meal.id, type, "Skipping")}
                                                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${activeMealGlow === `${meal.id}-${type}-Skipping` ? 'bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-red-500/30 hover:bg-red-500/10 text-red-500'}`}
                                            >
                                                <X className="w-4 h-4" /> <span className="text-xs font-bold">SKIPPING</span>
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
             </Card>
           ))}
        </div>

        {/* Dashboard Tracking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            {/* Complaints Tracker */}
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-xl">
                <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400 mb-4 tracking-widest uppercase border-b border-white/10 pb-2">
                    <AlertTriangle className="w-4 h-4"/> My Tickets
                </h3>
                <div className="space-y-3">
                    {myComplaints.length === 0 && <div className="text-xs text-slate-500 italic">No tickets filed.</div>}
                    {myComplaints.map(c => (
                        <div key={c.id} onClick={() => setSelectedComplaint(c)} className="bg-black/30 p-3 rounded-lg border border-white/5 flex justify-between items-start cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-all">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(c.created_at).toLocaleDateString()}</span>
                                <div className="text-sm font-bold text-slate-200 mt-1">{c.category}</div>
                                <div className="text-xs text-slate-400 line-clamp-1">{c.description}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                c.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                c.status === 'In_Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                'bg-green-500/10 text-green-400 border-green-500/30'
                            }`}>{c.status.replace("_", " ")}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leaves Tracker */}
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-xl">
                <h3 className="text-sm font-bold flex items-center gap-2 text-green-400 mb-4 tracking-widest uppercase border-b border-white/10 pb-2">
                    <CalendarRange className="w-4 h-4"/> My Leaves
                </h3>
                <div className="space-y-3">
                    {myLeaves.length === 0 && <div className="text-xs text-slate-500 italic">No leaves requested.</div>}
                    {myLeaves.map(l => (
                        <div key={l.id} onClick={() => setSelectedLeave(l)} className="bg-black/30 p-3 rounded-lg border border-white/5 flex justify-between items-start cursor-pointer hover:border-green-500/50 hover:bg-white/5 transition-all">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {l.start_date} - {l.end_date}
                                </span>
                                <div className="text-xs text-slate-300 line-clamp-2 mt-1">{l.reason}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                l.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                l.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                'bg-green-500/10 text-green-400 border-green-500/30'
                            }`}>{l.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Modals via Framer Motion */}
      <AnimatePresence>
        {(isComplaintModalOpen || isLeaveModalOpen || isPasswordModalOpen || selectedComplaint || selectedLeave) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   className="w-full max-w-md bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                >
                    {isComplaintModalOpen && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><AlertTriangle className="text-orange-400"/> File Complaint</h3>
                                <button onClick={() => setComplaintModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleComplaintSubmit} className="space-y-4">
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
                                    <Label className="text-slate-300">Category</Label>
                                    <select value={compCategory} onChange={(e) => setCompCategory(e.target.value)} className="w-full bg-slate-900 border-white/10 text-white p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none">
                                        <option value="Food" className="text-orange-400">Food</option>
                                        <option value="Water" className="text-blue-400">Water</option>
                                        <option value="Cleaning" className="text-purple-400">Cleaning</option>
                                        <option value="Electricity" className="text-yellow-400">Electricity</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </motion.div>
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
                                    <Label className="text-slate-300">Description</Label>
                                    <textarea value={compDesc} onChange={(e) => setCompDesc(e.target.value)} className="w-full bg-slate-900 border border-white/10 text-white p-2 rounded min-h-[100px] focus:ring-2 focus:ring-blue-400 outline-none" required />
                                </motion.div>
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
                                    <Label className="text-slate-300">Image (Optional)</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => setCompImage(e.target.files?.[0] || null)} className="bg-slate-900 border-white/10 text-slate-300 font-mono text-sm" />
                                </motion.div>
                                <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                    Submit Ticket
                                </motion.button>
                            </form>
                        </div>
                    )}
                    {isLeaveModalOpen && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><CalendarRange className="text-green-400"/> Request Leave</h3>
                                <button onClick={() => setLeaveModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                            </div>
                            <form onSubmit={handleLeaveSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
                                        <Label className="text-slate-300">Start Date</Label>
                                        <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} className="bg-slate-900 border-white/10 text-white" required />
                                    </motion.div>
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-2">
                                        <Label className="text-slate-300">End Date</Label>
                                        <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} className="bg-slate-900 border-white/10 text-white" required />
                                    </motion.div>
                                </div>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
                                    <Label className="text-slate-300">Reason</Label>
                                    <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className="w-full bg-slate-900 border border-white/10 text-white p-2 rounded min-h-[80px]" required />
                                </motion.div>
                                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} type="submit" className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                    Submit Request
                                </motion.button>
                            </form>
                        </div>
                    )}
                    {isPasswordModalOpen && (
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
                    )}
                    {selectedComplaint && (
                        <div className="p-6">
                             <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-400"><AlertTriangle className="w-5 h-5"/> Ticket Status</h3>
                                <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                            </div>
                            <div className="space-y-4">
                                <div><Label className="text-slate-400 text-xs uppercase tracking-widest">Category</Label><p className="font-bold text-lg text-slate-200">{selectedComplaint.category}</p></div>
                                <div><Label className="text-slate-400 text-xs uppercase tracking-widest">Date Filed</Label><p className="font-mono text-slate-300 text-sm">{new Date(selectedComplaint.created_at).toLocaleString()}</p></div>
                                <div>
                                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Description</Label>
                                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 mt-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs uppercase tracking-widest block mb-1">Current Status</Label>
                                    <span className={`text-xs font-bold px-3 py-1 rounded border inline-block ${
                                        selectedComplaint.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                        selectedComplaint.status === 'In_Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                        'bg-green-500/10 text-green-400 border-green-500/30'
                                    }`}>{selectedComplaint.status.replace("_", " ")}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {selectedLeave && (
                        <div className="p-6">
                             <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-green-400"><CalendarRange className="w-5 h-5"/> Leave Request</h3>
                                <button onClick={() => setSelectedLeave(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label className="text-slate-400 text-xs uppercase tracking-widest">Start</Label><p className="font-mono text-slate-200 text-sm mt-1">{selectedLeave.start_date}</p></div>
                                    <div><Label className="text-slate-400 text-xs uppercase tracking-widest">End</Label><p className="font-mono text-slate-200 text-sm mt-1">{selectedLeave.end_date}</p></div>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs uppercase tracking-widest">Justification / Reason</Label>
                                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 mt-1 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedLeave.reason}</div>
                                </div>
                                <div>
                                    <Label className="text-slate-400 text-xs uppercase tracking-widest block mb-1">Decision</Label>
                                    <span className={`text-xs font-bold px-3 py-1 rounded border inline-block ${
                                        selectedLeave.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                        selectedLeave.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                                        'bg-green-500/10 text-green-400 border-green-500/30'
                                    }`}>{selectedLeave.status}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
