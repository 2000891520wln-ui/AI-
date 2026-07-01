import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "journal-chip inline-flex items-center rounded-[7px] border-2 border-amber-950/20 bg-white/76 px-2.5 py-1 text-xs font-semibold tracking-[0.01em] text-amber-950 shadow-[2px_2px_0_rgba(70,42,18,.09)] backdrop-blur dark:border-amber-100/15 dark:bg-zinc-900/76 dark:text-amber-50",
        className
      )}
      {...props}
    />
  );
}
