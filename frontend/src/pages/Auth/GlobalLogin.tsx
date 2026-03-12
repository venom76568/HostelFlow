import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Building2, User } from "lucide-react";

export default function GlobalLogin() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0f172a] overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl grid md:grid-cols-2 gap-6 relative z-10">
        
        {/* College Admin Portal */}
        <Card className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-colors shadow-2xl flex flex-col justify-between">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                <Building2 className="text-blue-400 w-6 h-6" />
            </div>
            <CardTitle className="text-2xl text-white">College Administrator</CardTitle>
            <CardDescription className="text-slate-400">
              Manage your hostel operations, resolve complaints, and update meal menus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
               {/* Note: Standard admins will sign in using their email which the backend maps to their tenant. We will send them to an admin auth check or input page. For phase 3 we are separating the flow cleanly. */}
               <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white" onClick={() => navigate('/admin-login')}>
                   Login to College Portal
               </Button>
               <p className="text-center text-sm text-slate-500 mt-4">
                   Don't have an account? <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => navigate('/')}>Partner with us</span>
               </p>
          </CardContent>
        </Card>

        {/* Student Portal */}
        <Card className="bg-slate-900 border-slate-800 hover:border-purple-500/50 transition-colors shadow-2xl flex flex-col justify-between">
          <CardHeader>
             <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20">
                <User className="text-purple-400 w-6 h-6" />
            </div>
            <CardTitle className="text-2xl text-white">Student Portal</CardTitle>
            <CardDescription className="text-slate-400">
              Check daily mess menus, submit leave requests, and file maintenance complaints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-purple-500/50 transition-colors" onClick={() => navigate('/student-login')}>
                   Login to Student Portal
            </Button>
            <p className="text-center text-sm text-slate-500 mt-4">
                   New resident? <span className="text-purple-400 cursor-pointer hover:underline" onClick={() => navigate('/student-register')}>Register here</span>
               </p>
          </CardContent>
        </Card>

      </motion.div>
    </div>
  );
}
