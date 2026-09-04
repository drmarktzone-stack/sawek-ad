import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F1E6]",
  {
    variants: {
      variant: {
        default:
          "bg-navy text-white hover:bg-navy-soft shadow-[0_12px_28px_rgba(27,42,74,0.2)] hover:-translate-y-0.5",
        gold:
          "bg-gold text-navy hover:bg-[#d4b03a] shadow-[0_10px_24px_rgba(201,162,39,0.28)] hover:-translate-y-0.5",
        red: "bg-danger text-white hover:bg-[#c73a2e]",
        outline:
          "border border-navy/18 bg-white/90 text-navy hover:border-gold hover:bg-gold/10 backdrop-blur-sm",
        ghost: "text-muted hover:bg-navy/5 hover:text-navy",
        dark: "bg-gold text-navy border border-gold/40 hover:bg-[#d4b03a]",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
