import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-yellow/70",
  {
    variants: {
      variant: {
        default: "bg-omni-yellow text-black hover:bg-[#fff36a] shadow-[0_10px_36px_rgba(255,26,26,0.45)]",
        red: "bg-omni-red text-white hover:bg-[#ff4545]",
        outline:
          "border border-omni-yellow/70 bg-transparent text-omni-yellow hover:bg-omni-yellow/10",
        ghost: "text-zinc-300 hover:bg-white/5 hover:text-white",
        dark: "bg-omni-card text-white border border-white/10 hover:border-omni-yellow/40",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
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
