import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Zainstaluj aplikację na ekranie głównym"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#D4AF37] text-[#1A080C] text-xs font-semibold hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Zainstaluj</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Dodaj do ekranu głównego iOS"
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#D4AF37]/40 bg-[#24070D]/90 text-[#F3D982] text-xs font-medium hover:bg-[#3A0E17] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ekran główny</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#1A1311] border border-[#D4AF37]/30 p-5 text-[#F5EFE6] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-xl font-semibold text-[#F3D982]">
                  Instalacja na iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Zamknij"
                  className="p-1.5 rounded-lg text-[#C7BDB1] hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#E2D9CE]">
                Aby uruchomić wystawę na pełnym ekranie bez paska adresu:
                <br />
                1. Stuknij ikonę <strong>Udostępnij</strong> na dolnym pasku Safari.
                <br />
                2. Wybierz <strong>Do ekranu początkowego</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#D4AF37] py-2.5 text-sm font-semibold text-[#1A080C] hover:bg-[#E5C158] transition-colors cursor-pointer"
              >
                Rozumiem
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
