import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import './Button.css';

/** `danger` confirms a delete (filled red); `danger-outline` starts one. */
type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'danger-outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** Passed through to the <button>, e.g. to move focus back to it. */
  ref?: Ref<HTMLButtonElement>;
  /** Makes the button a toggle: styled as pressed and announced via aria-pressed. */
  active?: boolean;
}

export default function Button({
  variant = 'default',
  icon,
  active,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, active ? 'btn--active' : '', children ? '' : 'btn--icon-only', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} aria-pressed={active} {...props}>
      {icon}
      {children}
    </button>
  );
}
