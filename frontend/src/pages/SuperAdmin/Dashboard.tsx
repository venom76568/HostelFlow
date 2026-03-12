import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ShieldAlert, Power, KeyRound, X } from "lucide-react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  college_code: string | null;
  is_approved: boolean;
  is_active: boolean;
  admin_email: string;
};

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedPending, setSelectedPending] = useState<Tenant | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("super_token");
    if (!token) { navigate("/super-panel/login"); return; }
    fetchTenants();
  }, [navigate]);

  const fetchTenants = async () => {
    try {
        const token = localStorage.getItem("super_token");
        const res = await axios.get(`${API_URL}/partners/`, { headers: { Authorization: `Bearer ${token}` } });
        setTenants(res.data);
    } catch (error) { toast.error("Failed to fetch tenants"); }
  };

  const approveTenant = async (id: string) => {
    try {
        const token = localStorage.getItem("super_token");
        await axios.post(`${API_URL}/partners/${id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("College approved and Code generated!");
        setSelectedPending(null);
        fetchTenants();
    } catch (error) { toast.error("Failed to approve"); }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
        const token = localStorage.getItem("super_token");
        await axios.post(`${API_URL}/partners/${id}/toggle-active`, {}, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`College ${currentStatus ? 'Deactivated' : 'Activated'}`);
        fetchTenants();
    } catch (error) { toast.error("Failed to toggle status"); }
  };

  const handleLogout = () => { localStorage.removeItem("super_token"); navigate("/super-panel/login"); };

  // Metrics
  const activeColleges = tenants.filter(t => t.is_active).length;
  const pendingApprovals = tenants.filter(t => !t.is_approved).length;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] font-sans overflow-hidden">
      
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#111827]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
             <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 tracking-tight line-clamp-1">
                <ShieldAlert className="text-red-500 w-6 h-6 flex-shrink-0" /> <span className="text-white">Command <span className="text-red-500">Center</span></span>
             </h1>
             <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                <Power className="w-4 h-4"/> System Terminate
             </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        
        {/* Metric Cards */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"/>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-widest">Active Colleges</h3>
                <div className="mt-2 flex items-center gap-4">
                    <Building2 className="w-8 h-8 text-blue-400" />
                    <span className="text-4xl font-bold font-mono text-white">{activeColleges}</span>
                </div>
            </motion.div>
            <motion.div variants={itemVariants} className={`bg-[#1e293b]/50 backdrop-blur-xl border p-6 rounded-xl relative overflow-hidden group transition-all ${pendingApprovals > 0 ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}>
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl transition-all ${pendingApprovals > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-slate-500/10'}`}/>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-widest">Pending Approvals</h3>
                <div className="mt-2 flex items-center gap-4">
                    <KeyRound className={`w-8 h-8 ${pendingApprovals > 0 ? 'text-red-500' : 'text-slate-500'}`} />
                    <span className="text-4xl font-bold font-mono text-white">{pendingApprovals}</span>
                </div>
            </motion.div>
        </motion.div>

        {/* Tenant Network Table */}
        <div className="bg-[#1e293b]/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 bg-black/20">
                <h2 className="font-bold flex items-center gap-2 text-lg"><Building2 className="w-5 h-5 text-slate-400"/> Tenant Network</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-black/40 border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4">College Name</th>
                            <th className="px-6 py-4">Slug</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Active (Kill Switch)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map(t => (
                            <motion.tr 
                                key={t.id} 
                                layout
                                className={`border-b border-white/5 transition-all outline-none ${!t.is_active && t.is_approved ? 'opacity-50 grayscale bg-red-900/5 hover:bg-red-900/10' : 'hover:bg-white/5'}`}
                                onClick={() => { if (!t.is_approved) setSelectedPending(t); }}
                                style={{ cursor: !t.is_approved ? 'pointer' : 'default' }}
                            >
                                <td className="px-6 py-4 font-medium">
                                    <div className="text-white text-base">{t.name}</div>
                                    <div className="text-xs text-slate-400">{t.admin_email}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-400">{t.slug}</td>
                                <td className="px-6 py-4">
                                    {t.is_approved ? (
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30">Approved</span>
                                            {t.college_code && <span className="text-xs font-mono text-orange-400">Code: {t.college_code}</span>}
                                        </div>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">Pending Review</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 relative">
                                    <div className="flex justify-center items-center h-full">
                                        {t.is_approved ? (
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); toggleActive(t.id, t.is_active); }} 
                                                className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer transition-colors ${t.is_active ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`}
                                            >
                                                <motion.div layout className={`bg-white w-4 h-4 rounded-full shadow-md ${t.is_active ? 'ml-6' : 'ml-0'}`} />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-600 italic">Locked</span>
                                        )}
                                    </div>
                                    {/* Expiry Badge */}
                                    {!t.is_active && t.is_approved && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-red-500 border border-red-500 bg-red-950/80 px-3 py-1 font-bold tracking-widest text-xs rounded rotate-[-5deg] shadow-[0_0_15px_rgba(239,68,68,0.5)] backdrop-blur-sm">SUBSCRIPTION EXPIRED</span>
                                        </div>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                        {tenants.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">System holds zero tenant records.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

      </main>

      {/* Approval Modal */}
      <AnimatePresence>
        {selectedPending && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500" />
                    <button onClick={() => setSelectedPending(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                    
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">Contract Review</h2>
                    
                    <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5 mb-8">
                        <div>
                            <span className="text-xs text-slate-400 uppercase tracking-widest block">Entity Name</span>
                            <span className="text-lg font-medium text-white">{selectedPending.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-400 uppercase tracking-widest block">Subdomain/Slug</span>
                                <span className="font-mono text-blue-400">{selectedPending.slug}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 uppercase tracking-widest block">Admin Contact</span>
                                <span className="text-slate-300">{selectedPending.admin_email}</span>
                            </div>
                        </div>
                    </div>

                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => approveTenant(selectedPending.id)}
                        className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(34,197,94,0.4)] flex justify-center items-center gap-2"
                    >
                        <KeyRound className="w-5 h-5"/> Generate College Code & Approve
                    </motion.button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
}
