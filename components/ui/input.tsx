import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-[12px] border border-[rgba(8,17,31,0.16)] bg-white px-4 text-start text-[16px] text-ink placeholder:text-[#8794A3] outline-none transition-all focus:border-teal focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,122,107,0.16)]",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[12px] border border-[rgba(8,17,31,0.16)] bg-white px-4 py-3 text-start text-[16px] text-ink placeholder:text-[#8794A3] outline-none transition-all focus:border-teal focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,122,107,0.16)]",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-2 block text-start text-[0.78rem] font-black uppercase tracking-[0.14em] text-navy", className)} {...props} />
  );
}
