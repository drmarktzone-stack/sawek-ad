import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFBFC]",
  {
    variants: {
      variant: {
        default:
          "bg-navy text-white hover:bg-navy-soft shadow-[0_12px_28px_rgba(15,39,68,0.18)] hover:-translate-y-0.5",
        gold:
          "bg-teal text-white hover:bg-teal-soft shadow-[0_10px_24px_rgba(31,122,107,0.28)] hover:-translate-y-0.5",
        coral:
          "bg-coral text-white hover:bg-[#d46b52] shadow-[0_10px_24px_rgba(224,122,95,0.28)] hover:-translate-y-0.5",
        red: "bg-danger text-white hover:bg-[#b35242]",
        outline:
          "border border-navy/15 bg-white/95 text-navy hover:border-teal hover:bg-teal/5 backdrop-blur-sm",
        ghost: "text-muted hover:bg-navy/5 hover:text-navy",
        dark: "bg-teal text-white border border-teal/40 hover:bg-teal-soft",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-11 min-h-11 px-4 text-sm",
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
