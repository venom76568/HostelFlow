import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        
        const res = await axios.post(`${API_URL}/auth/login`, formData);
        const { access_token, role, slug } = res.data;
        
        if (role !== "Student") {
            toast.error("Not authorized as Student.");
            return;
        }

        localStorage.setItem("token", access_token);
        navigate(`/${slug}/dashboard`);
    } catch (err: any) {
        toast.error(err.response?.data?.detail || "Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0f172a]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md bg-slate-900 border-purple-500/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Student Login</CardTitle>
            <CardDescription className="text-slate-400">
              Access your personalized hostel dashboard.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white focus:ring-purple-500"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white">Login</Button>
              <div className="text-sm text-slate-500 text-center">
                  Don't have an account? <span className="text-purple-400 cursor-pointer hover:underline" onClick={() => navigate('/student-register')}>Register here</span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
