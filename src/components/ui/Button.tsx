import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** Makes the button a toggle: styled as pressed and announced via aria-pressed. */
  active?: boolean;
  small?: boolean;
  block?: boolean;
}

export default function Button({
  variant = 'default',
  icon,
  active,
  small,
  block,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    active ? 'btn--active' : '',
    small ? 'btn--small' : '',
    block ? 'btn--block' : '',
    children ? '' : 'btn--icon-only',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} aria-pressed={active} {...props}>
      {icon}
      {children}
    </button>
  );
}
