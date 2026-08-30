import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-start text-sm text-white placeholder:text-zinc-500 outline-none focus:border-omni-yellow/70",
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
        "min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-start text-sm text-white placeholder:text-zinc-500 outline-none focus:border-omni-yellow/70",
        className,
      )}
      {...props}
      dir={props.dir ?? "inherit"}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("mb-1.5 block text-start text-sm font-medium text-zinc-300", className)} {...props} />
  );
}
