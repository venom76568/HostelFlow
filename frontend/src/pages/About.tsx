import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Building2, CheckCircle, Users, Zap, Shield } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 font-sans overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/5 bg-[#111827]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                <Building2 className="text-blue-500"/> Jainpro
            </h1>
            <div className="flex gap-4 items-center">
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/')}>
                    Home
                </Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/about')}>
                    About Us
                </Button>
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => navigate('/contact')}>
                    Contact Us
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => navigate('/login')}>
                    Sign In/Sign Up
                </Button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
                Redefining <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Hostel Management</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                Jainpro was built with a single mission: to eliminate the administrative friction in educational institutions. We empower wardens with powerful tools and provide students with a seamless campus living experience.
            </p>
        </motion.div>
      </section>

      {/* Mission Statement */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center border-t border-b border-white/10 my-12 bg-slate-800/20 rounded-3xl">
          <h3 className="text-3xl font-bold mb-4">Our Mission</h3>
          <p className="text-lg text-slate-300 italic">
              "To bridge the gap between college administration and student comfort through intuitive, transparent, and scalable technology."
          </p>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <h3 className="text-3xl font-bold text-center mb-12">Core Features & Benefits</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                <Users className="w-10 h-10 text-blue-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Track connected students</h4>
                <p className="text-slate-400">Keep track of every resident seamlessly. Quick access to emergency contacts and room assignments.</p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                <Shield className="w-10 h-10 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Leave Management</h4>
                <p className="text-slate-400">Digital leave requests organized by date. Ensure safety and maintain accurate records without paperwork.</p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                <Zap className="w-10 h-10 text-yellow-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Complaint Hub</h4>
                <p className="text-slate-400">Robust ticketing system for maintenance and facilities. Prioritize, filter, and track resolutions instantly.</p>
            </div>
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                <CheckCircle className="w-10 h-10 text-green-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">Analytics & Reports</h4>
                <p className="text-slate-400">Real-time metrics on your dashboard. Export data with a single click for administrative audits.</p>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-20 py-8 text-center text-slate-500">
          <p>© {new Date().getFullYear()} HostelFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
