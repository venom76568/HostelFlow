import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function SuperAdminLogin() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const formData = new FormData();
        // The Super Admin username is managed in the backend .env
        formData.append("username", "admin@hostelflow.com"); 
        formData.append("password", password);
        
        const res = await axios.post(`${API_URL}/auth/login`, formData);
        const { access_token, role } = res.data;
        
        if (role !== "SuperAdmin") {
            toast.error("Not authorized as SuperAdmin.");
            return;
        }

        localStorage.setItem("super_token", access_token);
        navigate("/super-panel");
    } catch (err: any) {
        toast.error(err.response?.data?.detail || "Invalid master password");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Super Admin Access</CardTitle>
            <CardDescription className="text-slate-400">
              Enter the master password to access the platform controls.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Master Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Authenticate</Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
