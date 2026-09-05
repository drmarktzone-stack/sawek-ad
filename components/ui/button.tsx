import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-base font-bold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3EFE6]",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-[#F7F3EA] hover:bg-[#132033] shadow-[0_14px_32px_rgba(8,17,31,0.22)] hover:-translate-y-0.5",
        gold:
          "bg-teal text-white hover:bg-teal-soft shadow-[0_12px_28px_rgba(12,122,107,0.3)] hover:-translate-y-0.5",
        coral:
          "bg-coral text-white hover:bg-coral-soft shadow-[0_12px_28px_rgba(226,75,58,0.32)] hover:-translate-y-0.5",
        red: "bg-danger text-white hover:bg-[#b35242]",
        outline:
          "border border-[rgba(8,17,31,0.14)] bg-white text-navy hover:border-teal hover:bg-ivory",
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
