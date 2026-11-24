import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Lock,
  ScanLine,
  Smartphone,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  Box,
} from 'lucide-react';
import { museumAudio } from './audio/museumAudio';
import { CastleViewport } from './components/CastleViewport';
import { HotspotPopover } from './components/HotspotPopover';
import { InfoModal } from './components/InfoModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  CHRONO_LEGEND,
  ERAS,
  EraId,
  HOTSPOTS,
  HotspotId,
  MarkerType,
  ProjectedHotspot,
  ViewMode,
} from './types/castle';

export default function App() {
  const [mode, setMode] = useState<ViewMode>('3d');
  const [era, setEra] = useState<EraId>(2);
  const [xrayMode, setXrayMode] = useState(false);
  const [towerHdDetail, setTowerHdDetail] = useState(true);
  const [reconstructionPct, setReconstructionPct] = useState(65);
  const [activeMarker, setActiveMarker] = useState<MarkerType>('aw');
  const [arLocked, setArLocked] = useState(false);
  const [arStatus, setArStatus] = useState<{
    ready: boolean;
    detected: boolean;
    error: string | null;
  }>({ ready: false, detected: false, error: null });

  const [selectedHotspot, setSelectedHotspot] = useState<HotspotId | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [portcullisNotice, setPortcullisNotice] = useState<string | null>(null);
  const [projectedHotspots, setProjectedHotspots] = useState<ProjectedHotspot[]>([]);

  const noticeTimerRef = useRef<number | null>(null);

  // Unlock Web Audio API on first user gesture anywhere on screen
  useEffect(() => {
    const unlockOnce = () => {
      museumAudio.unlock();
      museumAudio.setEraAmbience(era);
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
  }, [era]);

  const triggerNotice = useCallback((msg: string) => {
    setPortcullisNotice(msg);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setPortcullisNotice(null);
    }, 2400);
  }, []);

  const handleSelectEra = useCallback((nextEra: EraId) => {
    setEra(nextEra);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (nextEra === 3) {
          navigator.vibrate([180, 90, 180]);
        } else {
          navigator.vibrate(100);
        }
      } catch {
        // Ignore vibration API restrictions
      }
    }
    museumAudio.playEraTransition(nextEra);
  }, []);

  const handleModeChange = useCallback((nextMode: ViewMode) => {
    setMode(nextMode);
    if (nextMode === '3d') {
      setArLocked(false);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      museumAudio.setMuted(next);
      return next;
    });
  }, []);

  const handlePortcullisToggle = useCallback(
    (isOpen: boolean) => {
      museumAudio.playPortcullisSound(isOpen);
      triggerNotice(isOpen ? 'Brona zamkowa uniesiona' : 'Brona zamkowa opuszczona');
    },
    [triggerNotice]
  );

  const handleGuardShot = useCallback(() => {
    museumAudio.playMusketShotSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(150);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }, []);

  const handleDragonWake = useCallback(() => {
    museumAudio.playDragonWakeFireSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 200]);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }, []);

  const handleSelectHotspot = useCallback((id: HotspotId | null) => {
    if (id !== null) {
      museumAudio.playHotspotParchmentSound();
    }
    setSelectedHotspot(id);
  }, []);

  const handleHotspotsUpdate = useCallback((next: ProjectedHotspot[]) => {
    setProjectedHotspots((prev) => {
      if (prev.length === next.length) {
        let same = true;
        for (let i = 0; i < prev.length; i++) {
          if (
            prev[i].id !== next[i].id ||
            prev[i].visible !== next[i].visible ||
            Math.abs(prev[i].x - next[i].x) >= 2 ||
            Math.abs(prev[i].y - next[i].y) >= 2
          ) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    });
  }, []);

  const currentEraMeta = ERAS.find((e) => e.id === era)!;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#120D0C] text-[#F5EFE6]">
      {/* Main 3D / WebAR Viewport */}
      <CastleViewport
        mode={mode}
        era={era}
        xrayMode={xrayMode}
        towerHdDetail={towerHdDetail}
        reconstructionPct={reconstructionPct}
        activeMarker={activeMarker}
        arLocked={arLocked}
        onArStatusChange={setArStatus}
        onPortcullisToggle={handlePortcullisToggle}
        onGuardShot={handleGuardShot}
        onDragonWake={handleDragonWake}
        onHotspotsUpdate={handleHotspotsUpdate}
      />

      {/* Offline PWA Banner */}
      <OfflineIndicator />

      {/* Projected 3D Interactive "i" Hotspots */}
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
        {projectedHotspots.map((hs) => {
          if (!hs.visible) return null;
          const isSelected = selectedHotspot === hs.id;
          const label = HOTSPOTS[hs.id].title;
          return (
            <button
              key={hs.id}
              type="button"
              onClick={() => handleSelectHotspot(isSelected ? null : hs.id)}
              title={label}
              aria-label={`Informacje: ${label}`}
              style={{
                transform: `translate3d(${hs.x}px, ${hs.y}px, 0) translate(-50%, -50%)`,
              }}
              className={`pointer-events-auto absolute top-0 left-0 flex items-center justify-center w-9 h-9 rounded-full border text-sm font-display font-bold italic shadow-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#D4AF37] text-[#1A080C] border-white'
                  : 'bg-[#24070D]/90 text-[#F6DF90] border-[#D4AF37]/80 hover:bg-[#3B0A14]'
              }`}
            >
              i
            </button>
          );
        })}
      </div>

      {/* Top Museum Header & Mode Controls */}
      <header className="fixed top-0 inset-x-0 z-30 pointer-events-none px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          {/* Left: Museum Title & Author Signature */}
          <div className="pointer-events-auto max-w-full sm:max-w-lg rounded-xl bg-[#16100E]/92 border border-[#D4AF37]/30 px-3.5 py-2.5 shadow-xl">
            <h1 className="font-display text-base sm:text-xl font-semibold leading-snug text-[#FBF6EE] tracking-tight">
              Racibórz: Miasto, którego już nie ma (WebAR 4D)
            </h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-[#C8B9A6]">
              Koncepcja i realizacja: <span className="text-[#E5C158] font-medium">Artur Wierzbicki</span>
            </p>
          </div>

          {/* Right: Compact Mode & Utility Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-[#16100E]/92 border border-[#D4AF37]/30 p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => handleModeChange('3d')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === '3d'
                  ? 'bg-[#D4AF37] text-[#1A080C]'
                  : 'text-[#DDD3C7] hover:text-white hover:bg-white/10'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('ar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'ar'
                  ? 'bg-[#D4AF37] text-[#1A080C]'
                  : 'text-[#DDD3C7] hover:text-white hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>AR</span>
            </button>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F3D982] hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>INFO</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              title={muted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
              aria-label={muted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
              className="p-2 rounded-lg text-[#C7BDB1] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* AR Tracking Guidance Banner */}
      {mode === 'ar' && (
        <div className="fixed top-28 sm:top-24 inset-x-4 z-20 flex justify-center pointer-events-none">
          {arStatus.error ? (
            <div className="pointer-events-auto max-w-md rounded-xl bg-[#450A0A]/95 border border-[#FCA5A5]/40 px-4 py-3 text-xs text-[#FEE2E2] shadow-xl text-center space-y-2">
              <p className="font-semibold">Nie udało się uruchomić kamery AR</p>
              <p className="text-[#FECACA]">{arStatus.error}</p>
              <button
                type="button"
                onClick={() => handleModeChange('3d')}
                className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#1A080C] font-semibold cursor-pointer"
              >
                Wróć do trybu 3D
              </button>
            </div>
          ) : !arStatus.detected && !arLocked ? (
            <div className="pointer-events-auto max-w-md rounded-xl bg-[#16100E]/90 border border-[#D4AF37]/45 px-4 py-2.5 text-center shadow-xl">
              <p className="text-xs font-medium text-[#F5EFE6]">
                {arStatus.ready
                  ? `Skieruj kamerę na znacznik ${activeMarker === 'aw' ? 'AW (/marker-aw.patt)' : 'Hiro (/hiro.patt)'} na stole`
                  : 'Uruchamianie kamery i lokalnego śledzenia ARToolKit5...'}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Gatehouse Portcullis Feedback Toast */}
      {portcullisNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-lg bg-[#24070D]/95 border border-[#D4AF37]/60 px-3.5 py-1.5 text-xs font-medium text-[#F6DF90] shadow-lg whitespace-nowrap">
          {portcullisNotice}
        </div>
      )}

      {/* Hotspot Historical Note Popover */}
      {selectedHotspot && (
        <HotspotPopover
          hotspotId={selectedHotspot}
          era={era}
          onClose={() => setSelectedHotspot(null)}
          onSelectHotspot={(id) => handleSelectHotspot(id)}
        />
      )}

      {/* Collapsible Unified Bottom Control Dock / Minimal Timeline Slider Mode */}
      <div className="fixed bottom-3 inset-x-0 z-30 flex flex-col items-center px-3 pointer-events-none">
        {dockCollapsed ? (
          /* Minimal Mode: narrow semi-transparent bar with timeline slider only + restore button */
          <div className="pointer-events-auto flex items-center gap-3 w-full max-w-md rounded-xl bg-[#16100E]/75 border border-[#D4AF37]/30 px-3.5 py-2 shadow-xl">
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={era}
              onChange={(e) => handleSelectEra(Number(e.target.value) as EraId)}
              aria-label="Oś czasu epok"
              className="museum-slider flex-1"
            />
            <button
              type="button"
              onClick={() => setDockCollapsed(false)}
              className="flex items-center gap-1 rounded-lg bg-[#24070D]/90 border border-[#D4AF37]/40 px-2.5 py-1.5 text-[11px] font-medium text-[#E5C158] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Pokaż panel epok</span>
            </button>
          </div>
        ) : (
          <>
            {/* Collapse Handle */}
            <button
              type="button"
              onClick={() => setDockCollapsed(true)}
              className="pointer-events-auto mb-1 flex items-center gap-1.5 rounded-t-lg rounded-b-md bg-[#181210]/94 border border-[#D4AF37]/35 px-3 py-1 text-[11px] font-medium text-[#E5C158] hover:text-white transition-colors shadow-lg cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Ukryj panel</span>
            </button>

            {/* Full Dock Panel */}
            <div className="pointer-events-auto w-full max-w-[920px] rounded-xl bg-[#16100E]/94 border border-[#D4AF37]/35 p-3 sm:p-3.5 shadow-2xl space-y-2.5">
              {/* Active Era Title + HD Detail, RTG & AR Lock Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-mono-tabular">
                    <span>ODSŁONA {currentEraMeta.roman}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentEraMeta.years}</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-semibold text-white leading-tight truncate">
                    {currentEraMeta.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {mode === 'ar' && (
                    <button
                      type="button"
                      onClick={() => setArLocked((l) => !l)}
                      disabled={!arStatus.detected && !arLocked}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        arLocked
                          ? 'bg-[#D4AF37] text-[#1A080C] border-[#D4AF37]'
                          : 'bg-[#24070D] text-[#F6DF90] border-[#D4AF37]/50 hover:bg-[#3B0A14]'
                      }`}
                    >
                      {arLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{arLocked ? 'Odblokuj znacznik' : 'Zablokuj na stole'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTowerHdDetail((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      towerHdDetail
                        ? 'bg-[#78350F] text-[#FEF3C7] border-[#D4AF37]'
                        : 'bg-black/45 text-[#CFC5B8] border-white/15 hover:border-[#D4AF37]/50 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Detal HD wieży: {towerHdDetail ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setXrayMode((x) => !x)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      xrayMode
                        ? 'bg-[#1E3A8A] text-white border-[#60A5FA]'
                        : 'bg-black/45 text-[#E5DDD2] border-white/15 hover:border-[#D4AF37]/50 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Warstwy Wieków (RTG)</span>
                  </button>
                </div>
              </div>

            {/* Era 4 Reconstruction / 3D Laser Scan Slider */}
            {era === 4 && (
              <div className="rounded-lg bg-black/40 border border-[#D4AF37]/25 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[#F3D982]">
                    <ScanLine className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Rekonstrukcja / Przenikanie (Skanowanie 3D)</span>
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#F6DF90]">
                    {reconstructionPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={reconstructionPct}
                  onChange={(e) => setReconstructionPct(Number(e.target.value))}
                  aria-label="Rekonstrukcja i przenikanie skanu 3D"
                  className="museum-slider"
                />
              </div>
            )}

            {/* RTG Chronological Layer Key */}
            {xrayMode && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#E2D9CE] px-1">
                {CHRONO_LEGEND.map((item) => (
                  <div key={item.layer} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="font-medium text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 4 Eras Selector Buttons */}
            <div className="grid grid-cols-4 gap-1.5 bg-black/45 p-1 rounded-lg border border-white/10">
              {ERAS.map((item) => {
                const active = era === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectEra(item.id)}
                    className={`px-2 py-2 rounded-md text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D4AF37] text-[#1A080C] font-semibold shadow-sm'
                        : 'text-[#CFC5B8] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[11px] sm:text-xs font-semibold leading-tight truncate">
                      {item.century}
                    </div>
                    <div
                      className={`hidden sm:block text-[10px] leading-tight truncate mt-0.5 ${
                        active ? 'text-[#2B1408]' : 'text-[#968A7D]'
                      }`}
                    >
                      {item.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Concise Historical Caption / AR Interaction Tip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#AFA497] px-0.5">
              <p className="line-clamp-1">{currentEraMeta.summary}</p>
              <span className="hidden md:inline font-mono-tabular text-[#C8B9A6] shrink-0">
                {mode === 'ar'
                  ? 'Przesuń palcem lewo/prawo, aby obrócić zamek'
                  : era >= 2
                    ? 'Kliknij strażnika lub bramę z broną'
                    : 'Kliknij strażnika lub obracaj makietę'}
              </span>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Exhibition Info & Marker Settings Modal */}
      <InfoModal
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        activeMarker={activeMarker}
        onChangeMarker={setActiveMarker}
      />
    </div>
  );
}
