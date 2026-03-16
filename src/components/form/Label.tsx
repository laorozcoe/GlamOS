import React, { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  color?: string;
}

const Label: FC<LabelProps> = ({ htmlFor, children, className, color = "text-gray-700 dark:text-gray-400" }) => {
  return (
    <label
      htmlFor={htmlFor}
      className={twMerge(
        // Default classes that apply by default
        `block text-sm font-medium ${color} `,

        // User-defined className that can override the default margin
        className
      )}
    >
      {children}
    </label>
  );
};

export default Label;
