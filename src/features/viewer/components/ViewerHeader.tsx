import type { ReactNode } from 'react';

/** Context bar of a viewer screen, under the app header: what is being viewed. */
export default function ViewerHeader({ children }: { children?: ReactNode }) {
  return <div className="viewer-header">{children}</div>;
}
