import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" />
          <p className="font-mono text-xs uppercase tracking-wider text-dim">Reset Password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="np" className="font-mono text-[10px] uppercase tracking-wider text-dim">
              New password
            </Label>
            <Input
              id="np"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-inset border-border font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full font-mono text-xs uppercase tracking-wider">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
