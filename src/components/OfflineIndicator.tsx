import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 z-40 flex items-center gap-2 rounded-lg bg-[#78350F] border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-medium text-[#FEF3C7] shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Tryb offline — zasoby zapisane lokalnie</span>
    </div>
  );
};
