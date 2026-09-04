import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border-2 border-navy/20 bg-white px-3.5 text-start text-base text-navy placeholder:text-muted outline-none focus:border-teal focus:ring-2 focus:ring-teal/25",
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
        "min-h-24 w-full rounded-xl border-2 border-navy/20 bg-white px-3.5 py-2.5 text-start text-base text-navy placeholder:text-muted outline-none focus:border-teal focus:ring-2 focus:ring-teal/25",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-start text-sm font-black text-navy", className)} {...props} />
  );
}
