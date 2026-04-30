// Card component (pattern from modernize-app)
import * as React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-white p-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
