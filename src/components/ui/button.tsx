import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[7px] text-sm font-semibold tracking-[0.01em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-2 border-zinc-900/80 bg-primary text-primary-foreground shadow-[3px_3px_0_rgba(39,25,10,.18)] hover:-translate-y-0.5 hover:bg-primary/90 dark:border-amber-50/75",
        ghost: "hover:-rotate-1 hover:bg-amber-200/45 dark:hover:bg-amber-300/10",
        outline: "border-2 border-zinc-900/55 bg-card/70 shadow-[2px_2px_0_rgba(39,25,10,.12)] hover:-translate-y-0.5 hover:bg-amber-100/70 dark:border-amber-50/35 dark:hover:bg-amber-300/10",
        subtle: "border-2 border-amber-950/25 bg-amber-100/70 text-amber-950 shadow-[2px_2px_0_rgba(39,25,10,.1)] hover:-rotate-1 hover:bg-amber-200/75 dark:border-amber-50/20 dark:bg-amber-300/10 dark:text-amber-50"
      },
      size: {
        default: "h-10 px-4 py-2",
        icon: "h-10 w-10",
        sm: "h-8 px-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
