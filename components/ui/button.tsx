import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
  {
    variants: {
      variant: {
        default: "bg-navy text-white hover:bg-[#24365e] shadow-[0_10px_28px_rgba(27,42,74,0.18)]",
        gold: "bg-gold text-navy hover:bg-[#d4b03a]",
        red: "bg-omni-red text-white hover:bg-[#c73a2e]",
        outline:
          "border border-navy/20 bg-white text-navy hover:border-gold hover:bg-gold/10",
        ghost: "text-muted hover:bg-navy/5 hover:text-navy",
        dark: "bg-gold text-navy border border-gold/40 hover:bg-[#d4b03a]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "h-10 w-10",
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
