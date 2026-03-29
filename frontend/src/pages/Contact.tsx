import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, CheckCircle2, MessageSquare, Menu, X as XIcon } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Contact() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/contact/`, {
        name,
        email,
        message,
      });
      setSuccess(true);
      toast.success("Message sent successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 font-sans overflow-hidden">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Contact Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
            {!success ? (
                <motion.div 
                    key="form"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-xl bg-slate-800/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative"
                >
                    <div className="text-center md:text-left mb-8">
                        <MessageSquare className="w-12 h-12 text-blue-500 mb-4 inline-block md:block" />
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Get in Touch</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Have questions about JainPro? Our team is here to help you optimize your hostel management experience.
          </p>          </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Your Name</Label>
                            <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="bg-slate-900/50 border-white/10 focus:ring-blue-500 py-6" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-slate-300">Email Address</Label>
                            <Input type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-900/50 border-white/10 focus:ring-blue-500 py-6" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Message</Label>
                            <Textarea 
                                placeholder="How can we help you?" 
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)} 
                                required 
                                className="bg-slate-900/50 border-white/10 focus:ring-blue-500 min-h-[150px] resize-none" 
                            />
                        </div>

                        <motion.button 
                            whileTap={{ scale: 0.98 }} 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full py-4 text-white font-bold rounded-xl mt-4 transition-all ${
                                isSubmitting ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            }`}
                        >
                            {isSubmitting ? "Sending..." : "Send Message"}
                        </motion.button>
                    </form>
                </motion.div>
            ) : (
                <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-slate-800/30 backdrop-blur-xl border border-green-500/30 rounded-3xl p-10 shadow-2xl text-center"
                 >
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
                        className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                    >
                        <CheckCircle2 className="w-10 h-10" />
                    </motion.div>
                    
                    <h3 className="text-3xl font-bold mb-4 text-white">Message Sent!</h3>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Thank you for reaching out. A member of our team will get back to you shortly at <span className="text-blue-400 font-semibold">{email}</span>.
                    </p>
                    
                    <Button variant="outline" className="border-white/20 text-slate-300 hover:text-white" onClick={() => navigate('/')}>
                        Return to Home
                    </Button>
                 </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}
