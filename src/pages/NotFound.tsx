import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6">
    <Logo size="lg" />
    <div className="text-center space-y-2">
      <h1 className="font-mono text-3xl text-foreground">404</h1>
      <p className="font-mono text-xs uppercase tracking-wider text-dim">Signal lost</p>
    </div>
    <Link to="/" className="font-mono text-xs uppercase tracking-wider text-accent hover:underline">
      ← Return to base
    </Link>
  </div>
);

export default NotFound;
