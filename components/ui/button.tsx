import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-base font-bold tracking-tight transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFEAE0]",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-[#F7F3EA] hover:bg-[#132033]",
        gold:
          "bg-teal text-white hover:bg-teal-soft",
        coral:
          "bg-coral text-white hover:bg-coral-soft",
        red: "bg-danger text-white hover:bg-[#b35242]",
        outline:
          "border border-[rgba(8,17,31,0.14)] bg-[var(--paper)] text-navy hover:border-teal",
        ghost: "text-muted hover:bg-ink/6 hover:text-navy",
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
