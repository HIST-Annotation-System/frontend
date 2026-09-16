import { createContext, useContext, type ReactNode } from 'react';
import { useMultipartUpload } from '../features/upload/hooks/useMultipartUpload';

type UploadContextValue = ReturnType<typeof useMultipartUpload>;

const UploadContext = createContext<UploadContextValue | null>(null);

interface UploadProviderProps {
  children: ReactNode;
}

/** Mounted above the router so an in-progress upload survives navigating between pages. */
export default function UploadProvider({ children }: UploadProviderProps) {
  const value = useMultipartUpload();
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextValue {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
