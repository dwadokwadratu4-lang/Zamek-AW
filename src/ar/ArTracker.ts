import * as THREE from 'three';
import ARToolkitExport from '@ar-js-org/artoolkit5-js';
import { MarkerType } from '../types/castle';

interface ARControllerInstance {
  loadMarker: (url: string) => Promise<number>;
  trackPatternMarkerId: (id: number, markerWidth?: number) => unknown;
  process: (video: HTMLVideoElement) => void;
  getCameraMatrix: () => Float64Array;
  addEventListener: (name: string, cb: (ev: { data: ARMarkerEventData }) => void) => void;
  removeEventListener: (name: string, cb: (ev: { data: ARMarkerEventData }) => void) => void;
  setPatternDetectionMode?: (mode: number) => number;
  setThresholdMode?: (mode: number) => number;
  dispose: () => void;
}

interface ARMarkerEventData {
  marker: {
    id: number;
    idPatt: number;
    cfPatt?: number;
  };
  matrix: Float64Array;
  matrixGL_RH: Float64Array;
}

interface ARControllerStatic {
  initWithDimensions: (
    width: number,
    height: number,
    cameraParam: string,
    options?: Record<string, unknown>
  ) => Promise<ARControllerInstance>;
}

function getARController(): ARControllerStatic {
  const mod = ARToolkitExport as unknown as {
    ARController?: ARControllerStatic;
    default?: { ARController?: ARControllerStatic };
  };
  const ctor = mod.ARController ?? mod.default?.ARController;
  if (!ctor) {
    throw new Error('Nie można zainicjalizować lokalnej biblioteki ARToolKit5.');
  }
  return ctor;
}

export interface ArSessionState {
  ready: boolean;
  markerDetected: boolean;
  error: string | null;
  cameraAspect: number;
}

export class ArTrackerSession {
  private stream: MediaStream | null = null;
  private controller: ARControllerInstance | null = null;
  private video: HTMLVideoElement;
  private awMarkerId = -1;
  private hiroMarkerId = -1;
  private activeMarker: MarkerType = 'aw';
  private lastSeenMs = 0;
  private detectedMatrix = new THREE.Matrix4();
  private hasEverDetected = false;
  private disposed = false;

  public cameraMatrix = new THREE.Matrix4();

  constructor(videoEl: HTMLVideoElement) {
    this.video = videoEl;
  }

  public setActiveMarker(marker: MarkerType) {
    this.activeMarker = marker;
    this.hasEverDetected = false;
    this.lastSeenMs = 0;
  }

  public async start(): Promise<{ width: number; height: number }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Przeglądarka nie obsługuje dostępu do kamery WebRTC.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    if (this.disposed) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('Sesja AR została zamknięta.');
    }

    this.stream = stream;
    this.video.srcObject = stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.muted = true;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        this.video.removeEventListener('loadedmetadata', onLoaded);
        this.video.play().then(() => resolve()).catch(reject);
      };
      this.video.addEventListener('loadedmetadata', onLoaded);
    });

    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;

    // Process at crisp mobile-friendly resolution keeping exact camera aspect ratio
    const procW = Math.min(vw, 640);
    const procH = Math.round((procW / vw) * vh);

    const ARController = getARController();
    const ctrl = await ARController.initWithDimensions(procW, procH, '/camera_para.dat');
    if (this.disposed) {
      ctrl.dispose();
      throw new Error('Sesja AR została zamknięta.');
    }

    this.controller = ctrl;

    // Load user's custom /marker-aw.patt and fallback /hiro.patt locally
    const [awId, hiroId] = await Promise.all([
      ctrl.loadMarker('/marker-aw.patt'),
      ctrl.loadMarker('/hiro.patt'),
    ]);

    this.awMarkerId = awId;
    this.hiroMarkerId = hiroId;
    ctrl.trackPatternMarkerId(awId, 1);
    ctrl.trackPatternMarkerId(hiroId, 1);

    const camMat = ctrl.getCameraMatrix();
    this.cameraMatrix.fromArray(camMat as unknown as number[]);

    ctrl.addEventListener('getMarker', (ev) => {
      const targetId = this.activeMarker === 'aw' ? this.awMarkerId : this.hiroMarkerId;
      const d = ev.data;
      if (d.marker && d.marker.idPatt === targetId) {
        const confidence = d.marker.cfPatt ?? 1;
        if (confidence >= 0.42) {
          const glMat = d.matrixGL_RH || d.matrix;
          this.detectedMatrix.fromArray(glMat as unknown as number[]);
          this.lastSeenMs = performance.now();
          this.hasEverDetected = true;
        }
      }
    });

    return { width: vw, height: vh };
  }

  public processFrame(): { detected: boolean; matrix: THREE.Matrix4 } {
    if (this.controller && this.video.readyState >= 2) {
      this.controller.process(this.video);
    }
    const now = performance.now();
    // 260ms grace window avoids micro-flicker if a single frame blurs
    const detected = this.hasEverDetected && now - this.lastSeenMs < 260;
    return {
      detected,
      matrix: this.detectedMatrix,
    };
  }

  public getProjectionMatrix(viewportWidth: number, viewportHeight: number): THREE.Matrix4 {
    const proj = this.cameraMatrix.clone();
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;
    const videoAspect = vw / vh;
    const screenAspect = viewportWidth / Math.max(1, viewportHeight);

    if (screenAspect < videoAspect) {
      proj.elements[0] *= videoAspect / screenAspect;
    } else if (screenAspect > videoAspect) {
      proj.elements[5] *= screenAspect / videoAspect;
    }
    return proj;
  }

  public dispose() {
    this.disposed = true;
    if (this.controller) {
      try {
        this.controller.dispose();
      } catch {
        // Ignore cleanup errors
      }
      this.controller = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
  }
}
