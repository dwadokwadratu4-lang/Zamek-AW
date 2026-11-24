import React from 'react';
import { X, QrCode, Printer, Compass, Layers } from 'lucide-react';
import { MarkerType } from '../types/castle';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarker: MarkerType;
  onChangeMarker: (marker: MarkerType) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  activeMarker,
  onChangeMarker,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#181210] border border-[#D4AF37]/35 text-[#F5EFE6] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#181210] border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-widest text-[#D4AF37]">
              Dokumentacja Koncepcji Wystawienniczej · WebAR 4D
            </p>
            <h2 id="info-modal-title" className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-white">
              Racibórz: Miasto, którego już nie ma
            </h2>
            <p className="mt-0.5 text-xs text-[#B9AEA0]">
              Koncepcja i realizacja: <strong className="text-[#F3D982]">Artur Wierzbicki</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij okno informacyjne"
            className="p-2 rounded-lg text-[#C7BDB1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Exhibition Potential */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F3D982] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#D4AF37]" />
              <span>Potencjał wdrożenia pełnej wystawy muzealnej</span>
            </h3>
            <p className="text-sm leading-relaxed text-[#E4DCD0]">
              Niniejszy prototyp prezentuje technologię cyfrowej rekonstrukcji 4D (przestrzeń 3D + oś czasu epok),
              przygotowaną z myślą o ekspozycji stałej lub czasowej w <strong>Muzeum w Raciborzu</strong> oraz na
              dziedzińcu <strong>Zamku Piastowskiego</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg bg-[#221916] border border-white/10 p-3.5">
                <h4 className="text-xs font-semibold text-[#F3D982]">
                  Kalibracja na oryginalnych planach archiwalnych
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#C7BDB1]">
                  Docelowe modele brył mogą zostać wymodelowane z dokładnością fotogrametryczną na podstawie
                  XIX-wiecznych planów inwentaryzacyjnych, zachowanych rycin, map katastralnych oraz wyników badań
                  archeologicznych muzeum.
                </p>
              </div>
              <div className="rounded-lg bg-[#221916] border border-white/10 p-3.5">
                <h4 className="text-xs font-semibold text-[#F3D982]">
                  Stanowiska bez aplikacji zewnętrznych (WebAR PWA)
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#C7BDB1]">
                  Zwiedzający skanuje kod QR przy gablocie lub na stole wystawienniczym i natychmiast uruchamia
                  rekonstrukcję bezpośrednio w przeglądarce smartfona — z trybem rozwarstwienia konserwatorskiego RTG
                  i dźwiękiem przestrzennym.
                </p>
              </div>
            </div>
          </section>

          {/* AR Marker Settings & Printable AW Marker */}
          <section className="border-t border-white/10 pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F3D982] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#D4AF37]" />
                <span>Konfiguracja znacznika WebAR</span>
              </h3>
              <span className="text-xs font-mono-tabular text-[#AFA497]">
                Lokalne śledzenie ARToolKit5 (offline-ready)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center rounded-lg bg-[#221916] border border-white/10 p-4">
              <div className="shrink-0 bg-white p-2 rounded-lg border border-[#D4AF37]/40">
                <img
                  src="/marker-aw.svg"
                  alt="Znacznik AR AW"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="flex-1 space-y-2.5">
                <p className="text-xs leading-relaxed text-[#D8CFC3]">
                  Domyślnie tryb <strong>[AR]</strong> śledzi autorski znacznik{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/50 text-[#F3D982] font-mono-tabular">
                    /marker-aw.patt
                  </code>
                  . W warunkach testowych możesz przełączyć rozpoznawanie na klasyczny znacznik <strong>Hiro</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg bg-black/45 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => onChangeMarker('aw')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        activeMarker === 'aw'
                          ? 'bg-[#D4AF37] text-[#1A080C] font-semibold'
                          : 'text-[#C9BFAF] hover:text-white'
                      }`}
                    >
                      Znacznik AW (/marker-aw.patt)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeMarker('hiro')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        activeMarker === 'hiro'
                          ? 'bg-[#D4AF37] text-[#1A080C] font-semibold'
                          : 'text-[#C9BFAF] hover:text-white'
                      }`}
                    >
                      Awaryjny Hiro (/hiro.patt)
                    </button>
                  </div>

                  <a
                    href="/marker-aw.svg"
                    download="znacznik-zamek-raciborz-aw.svg"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4AF37]/40 text-xs font-medium text-[#F3D982] hover:bg-[#D4AF37]/15 transition-colors whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Pobierz znacznik AW</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Guide */}
          <section className="border-t border-white/10 pt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B9AEA0] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Wskazówki obsługi makiety 4D</span>
            </h3>
            <ul className="text-xs text-[#C7BDB1] space-y-1.5 list-disc pl-4">
              <li>
                <strong>Odsłony wieków (1–4):</strong> Przełączaj epoki dolnym panelem, obserwując wyrastanie
                kondygnacji oraz efekty epokowe (dym kominowy XV w., Wielki Pożar XVIII/XIX w. z dzwonem alarmowym).
              </li>
              <li>
                <strong>Interaktywna brona:</strong> Stuknij bezpośrednio w Budynek Bramny (epoki II–IV), aby podnieść
                lub opuścić żelazną kratę obronną.
              </li>
              <li>
                <strong>Tryb AR „Zablokuj na stole”:</strong> Po wykryciu znacznika na kartce zablokuj pozycję makiety
                i obracaj zamek palcem w lewo/prawo.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3.5 bg-[#130E0C] flex items-center justify-between">
          <span className="text-xs text-[#8E8275]">
            Prototyp edukacyjno-muzealny · Racibórz
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1A080C] text-xs font-semibold hover:bg-[#E5C158] transition-colors cursor-pointer"
          >
            Powrót do makiety
          </button>
        </div>
      </div>
    </div>
  );
};
