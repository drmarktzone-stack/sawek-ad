import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/70",
  {
    variants: {
      variant: {
        default: "bg-navy text-white hover:bg-[#16324f] shadow-[0_10px_28px_rgba(16,42,67,0.22)]",
        gold: "bg-coral text-white hover:bg-[#c45c45] shadow-[0_10px_24px_rgba(224,122,95,0.28)]",
        red: "bg-omni-red text-white hover:bg-[#c73a2e]",
        outline:
          "border-2 border-navy/25 bg-white text-navy hover:border-teal hover:bg-teal/10",
        ghost: "text-navy hover:bg-navy/5 hover:text-navy",
        dark: "bg-teal text-white border border-teal hover:bg-[#095c5f]",
      },
      size: {
        default: "h-12 min-h-12 px-5",
        sm: "h-11 min-h-11 px-3 text-sm",
        lg: "h-14 min-h-14 px-6 text-base",
        icon: "h-11 w-11 min-h-11",
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
