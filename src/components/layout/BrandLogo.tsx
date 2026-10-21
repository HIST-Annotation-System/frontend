import { useTheme } from '../../context/ThemeProvider';
import logoLight from '../../assets/brand/histano-logo-light.png';
import logoDark from '../../assets/brand/histano-logo-dark.png';

interface BrandLogoProps {
  height: number;
  className?: string;
}

export default function BrandLogo({ height, className }: BrandLogoProps) {
  const { theme } = useTheme();
  return (
    <img
      src={theme === 'dark' ? logoDark : logoLight}
      alt="HistAno"
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}
