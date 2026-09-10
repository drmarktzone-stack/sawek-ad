import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] text-base font-bold tracking-tight transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ivory)]",
  {
    variants: {
      variant: {
        default:
          "bg-teal text-white hover:bg-teal-soft",
        gold:
          "rounded-[18px] bg-lime text-[var(--lime-ink)] hover:bg-[var(--lime-deep)]",
        coral:
          "rounded-[18px] bg-lime text-[var(--lime-ink)] hover:bg-[var(--lime-deep)]",
        red: "bg-danger text-white hover:bg-[#b35242]",
        outline:
          "border-2 border-[var(--ink)] bg-white text-navy hover:border-teal",
        ghost: "text-muted hover:bg-teal/8 hover:text-navy",
        dark: "bg-[var(--navy-deep)] text-white border border-white/10 hover:bg-navy",
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
