import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-mt-yellow text-mt-text font-semibold hover:bg-mt-yellow-dark active:bg-mt-yellow-dark',
  secondary: 'bg-mt-orange text-white font-semibold hover:bg-mt-orange-dark',
  outline: 'border border-mt-border bg-white text-mt-text hover:bg-mt-gray-50',
  danger: 'bg-mt-red/10 text-mt-red font-medium hover:bg-mt-red/20',
  ghost: 'text-mt-text-secondary hover:bg-mt-gray-100',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

export default Button;
