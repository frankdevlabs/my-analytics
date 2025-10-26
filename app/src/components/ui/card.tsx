/**
 * Card Components
 * Container components for grouped content with header and content sections
 */

import * as React from 'react';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg border border-foreground/10 bg-background text-foreground shadow-sm ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-1.5 p-6 ${className}`}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = '', ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
});
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={`text-sm text-foreground/60 ${className}`}
      {...props}
    />
  );
});
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
    );
  }
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center p-6 pt-0 ${className}`}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
