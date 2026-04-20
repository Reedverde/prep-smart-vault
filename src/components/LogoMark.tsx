import { cn } from "@/lib/utils";
import logoSrc from "@/assets/preppi-mascot.png";

interface LogoMarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LogoMark = ({ className, size = "lg" }: LogoMarkProps) => {
  const sizes = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-40 w-40",
  };
  return (
    <img
      src={logoSrc}
      alt="PrepPi"
      className={cn("object-contain", sizes[size], className)}
    />
  );
};
