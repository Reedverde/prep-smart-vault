import { LogoMark } from "./LogoMark";
import { LogoWordmark } from "./LogoWordmark";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo = ({ className, size = "md" }: LogoProps) => {
  if (size === "lg") {
    return <LogoMark className={className} size="lg" />;
  }
  return <LogoWordmark className={className} size={size} />;
};
