import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-5xl",
  };
  return (
    <span className={cn("font-mono font-bold tracking-tight", sizes[size], className)}>
      <span className="text-accent">PREP</span>
      <span className="text-primary">PI</span>
    </span>
  );
};
