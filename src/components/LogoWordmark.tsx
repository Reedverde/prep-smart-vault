import { cn } from "@/lib/utils";

interface LogoWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LogoWordmark = ({ className, size = "md" }: LogoWordmarkProps) => {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-5xl",
  };
  const leafSizes = {
    sm: "h-2.5 w-auto",
    md: "h-3 w-auto",
    lg: "h-5 w-auto",
  };
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      {/* Two green leaves above the "Prep" */}
      <svg
        viewBox="0 0 40 18"
        className={cn("-mb-0.5 -ml-6", leafSizes[size])}
        fill="hsl(var(--primary))"
        aria-hidden="true"
      >
        {/* Left leaf, tilted left */}
        <path d="M18 16 C 8 16, 2 10, 4 2 C 14 2, 20 8, 18 16 Z" />
        {/* Right leaf, tilted right */}
        <path d="M22 16 C 32 16, 38 10, 36 2 C 26 2, 20 8, 22 16 Z" />
        {/* Tiny stem */}
        <rect x="19.4" y="13" width="1.2" height="4" rx="0.6" fill="hsl(var(--primary))" />
      </svg>
      <span
        className={cn(
          "font-brand font-bold tracking-tight text-accent",
          sizes[size],
        )}
      >
        PrepPi
      </span>
    </span>
  );
};
