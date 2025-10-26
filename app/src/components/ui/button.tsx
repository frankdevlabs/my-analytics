/**
 * Button Component
 * Reusable button component with variant styles
 */

import * as React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      default:
        'bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-foreground',
      outline:
        'border-2 border-foreground/20 bg-transparent hover:bg-foreground/5 focus-visible:ring-foreground',
      ghost:
        'hover:bg-foreground/5 focus-visible:ring-foreground',
    };

    const sizeStyles = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
    };

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return <button className={combinedClassName} ref={ref} {...props} />;
  }
);

Button.displayName = 'Button';

export { Button };
