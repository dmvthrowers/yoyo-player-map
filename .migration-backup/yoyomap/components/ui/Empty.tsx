// Empty state component (pattern from modernize-app)
import * as React from "react";
import { cn } from "../../lib/utils";

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  message?: string;
}

export const Empty: React.FC<EmptyProps> = ({ icon, message = "No data found.", className, ...props }) => (
  <div className={cn("flex flex-col items-center justify-center py-12 text-gray-500", className)} {...props}>
    {icon && <div className="mb-2 text-4xl">{icon}</div>}
    <div>{message}</div>
  </div>
);
