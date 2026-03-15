import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "שגיאה", description: "כניסה עם Google נכשלה", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "נרשמת בהצלחה", description: "בדקי את המייל לאימות החשבון" });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">ART-AI</h1>
          <p className="mt-2 text-muted-foreground">
            {isSignUp ? "יצירת חשבון חדש" : "כניסה לחשבון"}
          </p>
        </div>

        {/* Google */}
        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          כניסה עם Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">או</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <Label className="text-foreground">אימייל</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-foreground">סיסמה</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              dir="ltr"
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="outline" disabled={loading} className="w-full">
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isSignUp ? "הרשמה" : "כניסה"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "יש לך חשבון?" : "אין לך חשבון?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-primary hover:text-primary/80"
          >
            {isSignUp ? "כניסה" : "הרשמי"}
          </button>
        </p>

        <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
          חזרה לגלריות
        </Button>
      </div>
    </div>
  );
};

export default LoginPage;
