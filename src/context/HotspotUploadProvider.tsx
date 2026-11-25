import { createContext, useContext, type ReactNode } from 'react';
import { useHotspotUpload } from '../features/hotspots/hooks/useHotspotUpload';

type HotspotUploadContextValue = ReturnType<typeof useHotspotUpload>;

const HotspotUploadContext = createContext<HotspotUploadContextValue | null>(null);

interface HotspotUploadProviderProps {
  children: ReactNode;
}

/** Mounted above the router so image uploads into a hotspot folder go on while navigating between pages. */
export default function HotspotUploadProvider({ children }: HotspotUploadProviderProps) {
  const value = useHotspotUpload();
  return <HotspotUploadContext.Provider value={value}>{children}</HotspotUploadContext.Provider>;
}

export function useHotspotUploadContext(): HotspotUploadContextValue {
  const context = useContext(HotspotUploadContext);
  if (!context) {
    throw new Error('useHotspotUploadContext must be used within a HotspotUploadProvider');
  }
  return context;
}
