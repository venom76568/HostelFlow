import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

type Meal = { id: string; date: string; breakfast: string; lunch: string; dinner: string; };

export default function StudentDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAnnounce, setShowAnnounce] = useState(true);
  
  // Modals state
  const [isComplaintModalOpen, setComplaintModalOpen] = useState(false);
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
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

  const fetchMeals = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get(`${API_URL}/meals/`, { headers: { Authorization: `Bearer ${token}` } });
      setMeals(res.data);
    } catch (err: any) {
       if (err.response?.status === 401 || err.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const handleResponse = async (mealId: string, status: "Having" | "Skipping") => {
      setActiveMealGlow(`${mealId}-${status}`);
      try {
           const token = getAuthToken();
           await axios.post(`${API_URL}/meals/${mealId}/respond`, { status }, { headers: { Authorization: `Bearer ${token}` } });
           toast.success(`Meal marked as ${status}`);
           setTimeout(() => setActiveMealGlow(null), 1000);
      } catch (err: any) {
          toast.error("Failed to record response.");
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
    } catch (err) {
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
    } catch (err) {
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
    navigate(`/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] font-sans pb-10">
      
      {/* Top Banner */}
      <AnimatePresence>
        {showAnnounce && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: -50, opacity: 0 }}
            className="w-full bg-yellow-500/20 border-b border-yellow-500/50 p-3 flex justify-between items-center z-50 shadow-[0_0_15px_rgba(234,179,8,0.3)] backdrop-blur-md"
          >
            <span className="text-yellow-400 font-medium text-sm">Update: Tonight's dinner menu has been revised to Paneer Butter Masala!</span>
            <button onClick={() => setShowAnnounce(false)} className="text-yellow-400 hover:text-yellow-300"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* Today's Meals */}
        <div>
           <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><UtensilsCrossed className="w-5 h-5"/> Today's Meals</h2>
           {meals.length === 0 && <div className="text-slate-500 italic p-4 text-center">No meals found for today.</div>}
           {meals.slice(0,1).map((meal) => (
             <Card key={meal.id} className="bg-slate-800/20 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-slate-800/40 font-mono text-center text-slate-300">
                    {meal.date}
                </div>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="text-center">
                            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">Breakfast</span>
                            <div className="text-lg font-medium">{meal.breakfast}</div>
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Lunch</span>
                            <div className="text-lg font-medium">{meal.lunch}</div>
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Dinner</span>
                            <div className="text-lg font-medium">{meal.dinner}</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleResponse(meal.id, "Having")}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeMealGlow === `${meal.id}-Having` ? 'bg-green-500/20 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'border-green-500/30 hover:bg-green-500/10 text-green-400'}`}
                        >
                            <Check className="w-8 h-8 mb-1" />
                            <span className="font-bold tracking-widest">HAVING</span>
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleResponse(meal.id, "Skipping")}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${activeMealGlow === `${meal.id}-Skipping` ? 'bg-red-500/20 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'border-red-500/30 hover:bg-red-500/10 text-red-500'}`}
                        >
                            <X className="w-8 h-8 mb-1" />
                            <span className="font-bold tracking-widest">SKIPPING</span>
                        </motion.button>
                    </div>
                </CardContent>
             </Card>
           ))}
        </div>
      </div>

      {/* Modals via Framer Motion */}
      <AnimatePresence>
        {(isComplaintModalOpen || isLeaveModalOpen || isPasswordModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 20 }}
                   className="w-full max-w-md bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
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
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
