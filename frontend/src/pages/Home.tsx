import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowRight, Building2, CheckCircle2, Menu, X as XIcon } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Home() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [assignedSlug, setAssignedSlug] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const resp = await axios.post(`${API_URL}/partners/apply`, {
        name,
        admin_email: email,
        admin_password: password
      });
      setAssignedSlug(resp.data.slug);
      setSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-slate-50 font-sans overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#111827]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                <Building2 className="text-blue-500"/> Jainpro
            </h1>

            {/* Desktop Nav */}
            <div className="hidden md:flex gap-4 items-center">
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/')}>Home</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/about')}>About Us</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/contact')}>Contact Us</Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/parent-attendance')}>Attendance</Button>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => navigate('/login')}>Sign In/Sign Up</Button>
            </div>

            {/* Mobile Nav */}
            <div className="flex md:hidden items-center gap-2">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1.5 h-auto" onClick={() => navigate('/login')}>Sign In/Sign Up</Button>
                <button
                    onClick={() => setMobileOpen(o => !o)}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/5 bg-[#111827]/80 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-6 py-3 flex flex-col gap-1">
                <button onClick={() => { navigate('/about'); setMobileOpen(false); }} className="text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">About Us</button>
                <button onClick={() => { navigate('/contact'); setMobileOpen(false); }} className="text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">Contact Us</button>
                <button onClick={() => { navigate('/parent-attendance'); setMobileOpen(false); }} className="text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">Attendance</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        
        <AnimatePresence mode="wait">
            {!isApplying && !success && (
                <motion.div 
                    key="hero"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-3xl"
                >
                    <div className="inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
                        Next-Gen Hostel Management
                    </div>
                    <h2 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 leading-tight">
                        Modernize your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">campus life.</span>
                    </h2>
                    <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                        A unified platform for meals, complaints, and leaves. Powerful administrative controls packed in a beautiful, responsive interface.
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                        <Button 
                            size="lg" 
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all flex border-0 items-center gap-2"
                            onClick={() => setIsApplying(true)}
                        >
                            Partner With Us <ArrowRight className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                </motion.div>
            )}

            {isApplying && !success && (
                <motion.div 
                    key="form"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-xl bg-slate-800/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative"
                >
                    <button 
                        onClick={() => setIsApplying(false)} 
                        className="absolute text-sm top-8 right-8 text-slate-400 hover:text-white transition-colors"
                    >
                        Back
                    </button>
                    <div className="mb-8 pr-12">
                        <h3 className="text-2xl font-bold mb-2">College Registration</h3>
                        <p className="text-slate-400 text-sm">Register your institution to get a dedicated management portal. SuperAdmin approval is required to activate the account.</p>
                    </div>

                    <form onSubmit={handleApply} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">College Name</Label>
                            <Input placeholder="e.g. Springfield Tech" value={name} onChange={(e) => setName(e.target.value)} required className="bg-slate-900/50 border-white/10 focus:ring-blue-500" />
                            <p className="text-xs text-slate-500">Your unique login URL will be generated based on this name.</p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <h4 className="text-sm font-semibold text-blue-400 mb-4">Initial Administrator Account</h4>
                            <Label className="text-slate-300">Admin Email</Label>
                            <Input type="email" placeholder="admin@springfield.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-900/50 border-white/10 focus:ring-blue-500" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-slate-300">Admin Password</Label>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-900/50 border-white/10 focus:ring-blue-500" />
                        </div>

                        <motion.button 
                            whileTap={{ scale: 0.98 }} 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full py-4 text-white font-bold rounded-xl mt-4 transition-all ${
                                isSubmitting ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            }`}
                        >
                            {isSubmitting ? "Processing..." : "Submit Application"}
                        </motion.button>
                    </form>
                </motion.div>
            )}

            {success && (
                 <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-slate-800/30 backdrop-blur-xl border border-green-500/30 rounded-2xl p-10 shadow-2xl text-center"
                 >
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                        className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    >
                        <CheckCircle2 className="w-10 h-10" />
                    </motion.div>
                    
                    <h3 className="text-3xl font-bold mb-4 text-white">Application Received!</h3>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Thank you for applying to HostelFlow. Your application for <span className="text-blue-400 font-semibold">{name}</span> is now pending review. 
                        Once approved by our SuperAdmin team, your college portal will be instantly activated at:
                    </p>
                    <div className="bg-black/40 p-4 rounded-lg font-mono text-sm text-center border border-white/5 mb-8 text-blue-300">
                        /{assignedSlug}/admin
                    </div>
                    
                    <Button variant="outline" className="border-white/20 text-slate-300 hover:text-white" onClick={() => navigate('/login')}>
                        Return to Home
                    </Button>
                 </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}
