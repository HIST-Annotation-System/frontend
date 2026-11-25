import { createContext, useContext, type ReactNode } from 'react';
import { useUploadQueue } from '../features/upload/hooks/useUploadQueue';

type UploadContextValue = ReturnType<typeof useUploadQueue>;

const UploadContext = createContext<UploadContextValue | null>(null);

interface UploadProviderProps {
  children: ReactNode;
}

/** Mounted above the router so the upload queue survives navigating between pages. */
export default function UploadProvider({ children }: UploadProviderProps) {
  const value = useUploadQueue();
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextValue {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
