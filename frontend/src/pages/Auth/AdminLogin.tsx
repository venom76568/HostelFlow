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

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        
        const res = await axios.post(`${API_URL}/auth/login`, formData);
        const { access_token, role, slug } = res.data;
        
        if (role !== "Admin") {
            toast.error("Not authorized as College Admin.");
            return;
        }

        localStorage.setItem("token", access_token);
        navigate(`/${slug}/admin`);
    } catch (err: any) {
        toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#0f172a]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md bg-slate-900 border-blue-500/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">College Admin Login</CardTitle>
            <CardDescription className="text-slate-400">
              Access your college's management portal.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@college.edu"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
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
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                {isLoading ? "Verifying..." : "Login"}
              </Button>
              <Button type="button" variant="ghost" className="w-full text-slate-400" onClick={() => navigate('/login')}>Back to System Login</Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
