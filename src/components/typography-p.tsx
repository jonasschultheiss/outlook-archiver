import { cn } from "@/lib/utils";

interface TypographyPProps {
  children: React.ReactNode;
  className?: string;
}

export function TypographyP({ children, className }: TypographyPProps) {
  return <p className={cn("leading-7", className)}>{children}</p>;
}
