import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { setAuthToken } from "@/lib/auth";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function Login() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const { slug } = useParams();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "login") {
      try {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);

        const res = await axios.post(`${API_URL}/auth/login`, formData);
        setAuthToken(res.data.access_token);
        
        const role = res.data.role;
        toast.success("Successfully logged in!");
        
        if (res.data.tenant_slug && res.data.tenant_slug !== slug) {
            navigate(`/${res.data.tenant_slug}/${role === "Admin" ? "admin" : "dashboard"}`);
            return;
        }

        if (role === "Admin") navigate(`/${slug}/admin`);
        else navigate(`/${slug}/dashboard`);
        
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Login failed");
      }
    } else {
      try {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            full_name: fullName,
            college_code: collegeCode,
            role: "Student"
        });
        toast.success("Registration successful! Please log in.");
        setActiveTab("login");
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Registration failed");
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Interactive Mesh Gradient Background */}
      <motion.div
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        className="absolute inset-0 z-0 bg-gradient-to-br from-[#0f172a] via-[#312e81] to-[#1e1b4b] bg-[length:200%_200%]"
      />

      <motion.div 
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Card className="w-full bg-slate-800/30 backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-col items-center">
              <CardTitle className="text-3xl font-bold text-white tracking-tight">HostelFlow</CardTitle>
              <CardDescription className="text-slate-300">Tenant Access Portal</CardDescription>
            </div>
            
            {/* Custom Tabs */}
            <div className="flex p-1 bg-slate-900/50 rounded-lg">
                <button 
                  type="button"
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab('login')}
                >
                  Login
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'signup' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  onClick={() => setActiveTab('signup')}
                >
                  Signup
                </button>
            </div>
          </CardHeader>
          
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              <AnimatePresence mode="popLayout">
                  {activeTab === "signup" && (
                    <motion.div 
                      key="signup-fields"
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="bg-slate-900/50 border-white/10 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                          required={activeTab === "signup"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="collegeCode" className="text-slate-300">Hostel Code</Label>
                        <Input
                          id="collegeCode"
                          placeholder="6 Digit Code"
                          value={collegeCode}
                          onChange={(e) => setCollegeCode(e.target.value)}
                          className="bg-slate-900/50 border-white/10 text-white uppercase font-mono tracking-widest focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                          required={activeTab === "signup"}
                        />
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/50 border-white/10 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-white/10 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    {activeTab === "login" ? "Enter Portal" : "Register"}
                  </Button>
              </motion.div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
