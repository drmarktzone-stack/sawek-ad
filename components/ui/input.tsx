import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-navy/15 bg-white px-3 text-start text-base text-navy placeholder:text-muted outline-none focus:border-gold",
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
        "min-h-24 w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-start text-base text-navy placeholder:text-muted outline-none focus:border-gold",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-start text-sm font-medium text-navy", className)} {...props} />
  );
}
