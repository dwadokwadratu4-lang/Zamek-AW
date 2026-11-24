import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Eye,
  Hand,
  Info,
  Lock,
  Power,
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
import { TourSyncClient, TourStatePayload } from './tour/tourSync';
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

  // Live TOUR Guide State (MQTT over WebSockets)
  const [tourRole, setTourRole] = useState<'idle' | 'host'>('idle');
  const [tourPointerMode, setTourPointerMode] = useState<'point' | 'orbit'>('point');
  const [hostTourPos, setHostTourPos] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 1.4,
    z: 0,
  });
  const [hostTourSize, setHostTourSize] = useState<number>(0.75);
  const [remoteTourState, setRemoteTourState] = useState<{
    active: boolean;
    era: EraId;
    pos: { x: number; y: number; z: number };
    size: number;
  }>({
    active: false,
    era: 2,
    pos: { x: 0, y: 1.4, z: 0 },
    size: 0.75,
  });

  const noticeTimerRef = useRef<number | null>(null);
  const tourClientRef = useRef<TourSyncClient | null>(null);
  const tourRoleRef = useRef(tourRole);
  const eraRef = useRef(era);
  const hostTourPosRef = useRef(hostTourPos);
  const hostTourSizeRef = useRef(hostTourSize);
  const wasRemoteTourActiveRef = useRef(false);

  tourRoleRef.current = tourRole;
  eraRef.current = era;
  hostTourPosRef.current = hostTourPos;
  hostTourSizeRef.current = hostTourSize;

  // Connect to public EMQX WebSocket broker for live TOUR synchronization
  useEffect(() => {
    const client = new TourSyncClient({
      onRemoteState: (payload: TourStatePayload) => {
        if (tourRoleRef.current === 'host') {
          return;
        }
        if (payload.active) {
          if (!wasRemoteTourActiveRef.current) {
            wasRemoteTourActiveRef.current = true;
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(150);
              } catch {
                // Ignore vibration restrictions
              }
            }
            museumAudio.playTourNotifyChime();
          }
          setRemoteTourState({
            active: true,
            era: payload.era,
            pos: { x: payload.x, y: payload.y, z: payload.z },
            size: payload.size,
          });
        } else {
          wasRemoteTourActiveRef.current = false;
          setRemoteTourState((prev) => ({ ...prev, active: false }));
        }
      },
    });
    tourClientRef.current = client;
    client.connect();

    const handleBeforeUnload = () => {
      if (tourRoleRef.current === 'host') {
        client.publishImmediate({
          active: false,
          era: eraRef.current,
          x: hostTourPosRef.current.x,
          y: hostTourPosRef.current.y,
          z: hostTourPosRef.current.z,
          size: hostTourSizeRef.current,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
      client.dispose();
      tourClientRef.current = null;
    };
  }, []);

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

    if (tourRoleRef.current === 'host') {
      tourClientRef.current?.publishImmediate({
        active: true,
        era: nextEra,
        x: hostTourPosRef.current.x,
        y: hostTourPosRef.current.y,
        z: hostTourPosRef.current.z,
        size: hostTourSizeRef.current,
      });
    }
  }, []);

  const handleStartTour = useCallback(() => {
    setInfoOpen(false);
    setTourRole('host');
    setTourPointerMode('point');
    wasRemoteTourActiveRef.current = false;
    setRemoteTourState((prev) => ({ ...prev, active: false }));

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(150);
      } catch {
        // Ignore vibration restrictions
      }
    }

    const pos = hostTourPosRef.current;
    const size = hostTourSizeRef.current;
    tourClientRef.current?.publishImmediate({
      active: true,
      era: eraRef.current,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      size,
    });
  }, []);

  const handleStopTour = useCallback(() => {
    setTourRole('idle');
    wasRemoteTourActiveRef.current = false;
    setRemoteTourState((prev) => ({ ...prev, active: false }));
    tourClientRef.current?.publishImmediate({
      active: false,
      era: eraRef.current,
      x: hostTourPosRef.current.x,
      y: hostTourPosRef.current.y,
      z: hostTourPosRef.current.z,
      size: hostTourSizeRef.current,
    });
  }, []);

  const handleTourPoint = useCallback((pos: { x: number; y: number; z: number }) => {
    setHostTourPos(pos);
    if (tourRoleRef.current === 'host') {
      tourClientRef.current?.publishThrottled({
        active: true,
        era: eraRef.current,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        size: hostTourSizeRef.current,
      });
    }
  }, []);

  const handleTourSizeChange = useCallback((nextSize: number) => {
    setHostTourSize(nextSize);
    if (tourRoleRef.current === 'host') {
      tourClientRef.current?.publishThrottled({
        active: true,
        era: eraRef.current,
        x: hostTourPosRef.current.x,
        y: hostTourPosRef.current.y,
        z: hostTourPosRef.current.z,
        size: nextSize,
      });
    }
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
  const isHost = tourRole === 'host';
  const isViewerTourActive = !isHost && remoteTourState.active;
  const tourSphereVisible = isHost || (isViewerTourActive && era === remoteTourState.era);
  const activeTourPos = isHost ? hostTourPos : remoteTourState.pos;
  const activeTourSize = isHost ? hostTourSize : remoteTourState.size;

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
        tourSphereVisible={tourSphereVisible}
        tourSpherePos={activeTourPos}
        tourSphereSize={activeTourSize}
        tourPointingActive={isHost && tourPointerMode === 'point'}
        onTourPoint={handleTourPoint}
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
          {/* Left: Museum Title, Author Signature & Viewer Pulsing TOUR Badge */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="pointer-events-auto max-w-full sm:max-w-lg rounded-xl bg-[#16100E]/92 border border-[#D4AF37]/30 px-3.5 py-2.5 shadow-xl">
              <h1 className="font-display text-base sm:text-xl font-semibold leading-snug text-[#FBF6EE] tracking-tight">
                Racibórz: Miasto, którego już nie ma (WebAR 4D)
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-[#C8B9A6]">
                Koncepcja i realizacja: <span className="text-[#E5C158] font-medium">Artur Wierzbicki</span>
              </p>
            </div>

            {isHost && (
              <div
                aria-label={`Nadawanie TOUR na zakładce ${era}`}
                className="pointer-events-auto flex items-center gap-2 rounded-xl bg-[#2A0E0E]/94 border border-[#EF4444]/65 px-3 py-2 text-xs font-bold tracking-wide text-white shadow-xl"
              >
                <span className="font-mono-tabular">TOUR</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF1E1E] shadow-[0_0_8px_#EF4444] ring-2 ring-white/75 shrink-0 animate-[pulse_2.2s_ease-in-out_infinite]" />
                <span className="font-mono-tabular whitespace-nowrap text-[#FCA5A5]">
                  / tab. {era}
                </span>
              </div>
            )}

            {isViewerTourActive && (
              <button
                type="button"
                onClick={() => handleSelectEra(remoteTourState.era)}
                title="Kliknij, aby przełączyć makietę na epokę przewodnika"
                className="pointer-events-auto flex items-center gap-2 rounded-xl bg-[#7F1D1D]/92 border border-[#F87171]/65 px-3 py-2 text-xs font-bold tracking-wide text-white shadow-xl hover:bg-[#991B1B] transition-colors cursor-pointer animate-pulse"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-white/80 shrink-0" />
                <span className="font-mono-tabular whitespace-nowrap">
                  TOUR ON / tab. {remoteTourState.era}
                </span>
              </button>
            )}
          </div>

          {/* Right: Compact Mode & Utility Buttons + Host Exit TOUR Button */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isHost && (
              <button
                type="button"
                onClick={handleStopTour}
                className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-[#991B1B]/95 border border-[#FCA5A5]/60 px-3.5 py-2.5 text-xs font-bold text-white shadow-xl hover:bg-[#B91C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Wyłącz TOUR</span>
              </button>
            )}

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

      {/* Collapsible Unified Bottom Control Dock / Minimal Timeline Slider Mode + Host TOUR Bar */}
      <div className="fixed bottom-3 inset-x-0 z-30 flex flex-col items-center px-3 pointer-events-none">
        {isHost && (
          <div className="pointer-events-auto mb-2 flex flex-wrap items-center justify-between gap-2 w-full max-w-[920px] rounded-xl bg-[#1C1110]/85 border border-[#EF4444]/45 px-3 py-2 shadow-2xl">
            {/* Touch Mode Toggle */}
            <div className="inline-flex rounded-lg bg-black/50 p-1 border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setTourPointerMode('point')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tourPointerMode === 'point'
                    ? 'bg-[#DC2626] text-white'
                    : 'text-[#D6CCC0] hover:text-white'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Wskaż kulą</span>
              </button>
              <button
                type="button"
                onClick={() => setTourPointerMode('orbit')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  tourPointerMode === 'orbit'
                    ? 'bg-[#D4AF37] text-[#1A080C]'
                    : 'text-[#D6CCC0] hover:text-white'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Obracaj kamerę</span>
              </button>
            </div>

            {/* Yellow Zone + Red LED Size Slider */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[160px] max-w-xs px-1">
              <span className="w-4 h-4 rounded-full bg-[#FACC15]/75 border border-[#FACC15] flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E1E]" />
              </span>
              <input
                type="range"
                min={0.25}
                max={2.2}
                step={0.05}
                value={hostTourSize}
                onChange={(e) => handleTourSizeChange(Number(e.target.value))}
                aria-label="Wielkość strefy wskaźnika przewodnika"
                className="museum-slider flex-1"
              />
              <span className="font-mono-tabular text-[11px] font-semibold text-[#FDE047] w-9 text-right shrink-0">
                {hostTourSize.toFixed(2)}
              </span>
            </div>

            {/* End TOUR Button */}
            <button
              type="button"
              onClick={handleStopTour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#991B1B] border border-[#EF4444]/60 text-white text-xs font-semibold hover:bg-[#B91C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Zakończ TOUR</span>
            </button>
          </div>
        )}

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
        onStartTour={handleStartTour}
      />
    </div>
  );
}
