import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-navy/12 bg-sand/40 px-4 text-start text-base text-navy placeholder:text-muted/80 outline-none transition-colors focus:border-teal focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,122,107,0.14)]",
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
        "min-h-28 w-full rounded-2xl border border-navy/12 bg-sand/40 px-4 py-3 text-start text-base text-navy placeholder:text-muted/80 outline-none transition-colors focus:border-teal focus:bg-white focus:shadow-[0_0_0_4px_rgba(31,122,107,0.14)]",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-2 block text-start text-sm font-black tracking-wide text-navy", className)} {...props} />
  );
}
