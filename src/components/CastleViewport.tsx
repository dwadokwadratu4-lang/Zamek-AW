import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArTrackerSession } from '../ar/ArTracker';
import { buildRaciborzCastle, CastleController } from '../three/CastleSceneBuilder';
import { createCastleMaterials } from '../three/materials';
import { EraId, HotspotId, MarkerType, ProjectedHotspot, ViewMode } from '../types/castle';

interface CastleViewportProps {
  mode: ViewMode;
  era: EraId;
  xrayMode: boolean;
  towerHdDetail: boolean;
  reconstructionPct: number;
  activeMarker: MarkerType;
  arLocked: boolean;
  onArStatusChange: (status: {
    ready: boolean;
    detected: boolean;
    error: string | null;
  }) => void;
  onPortcullisToggle: (isOpen: boolean) => void;
  onGuardShot: () => void;
  onDragonWake: () => void;
  onHotspotsUpdate: (hotspots: ProjectedHotspot[]) => void;
}

const _projVec = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _targetScale = new THREE.Vector3();
const _poseSmoothPos = new THREE.Vector3();
const _poseSmoothQuat = new THREE.Quaternion();

export const CastleViewport: React.FC<CastleViewportProps> = ({
  mode,
  era,
  xrayMode,
  towerHdDetail,
  reconstructionPct,
  activeMarker,
  arLocked,
  onArStatusChange,
  onPortcullisToggle,
  onGuardShot,
  onDragonWake,
  onHotspotsUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Latest props stored in refs so WebGL lifecycle never restarts on state changes
  const modeRef = useRef(mode);
  const eraRef = useRef(era);
  const xrayRef = useRef(xrayMode);
  const hdRef = useRef(towerHdDetail);
  const reconRef = useRef(reconstructionPct);
  const markerRef = useRef(activeMarker);
  const arLockedRef = useRef(arLocked);

  const onArStatusRef = useRef(onArStatusChange);
  const onPortcullisRef = useRef(onPortcullisToggle);
  const onGuardShotRef = useRef(onGuardShot);
  const onDragonWakeRef = useRef(onDragonWake);
  const onHotspotsRef = useRef(onHotspotsUpdate);

  onArStatusRef.current = onArStatusChange;
  onPortcullisRef.current = onPortcullisToggle;
  onGuardShotRef.current = onGuardShot;
  onDragonWakeRef.current = onDragonWake;
  onHotspotsRef.current = onHotspotsUpdate;

  const castleCtrlRef = useRef<CastleController | null>(null);
  const arSessionRef = useRef<ArTrackerSession | null>(null);
  const arYawRef = useRef(0);
  const hasLockedPoseRef = useRef(false);

  // Sync imperative updates to Three.js controller
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    eraRef.current = era;
    castleCtrlRef.current?.setEra(era);
  }, [era]);

  useEffect(() => {
    xrayRef.current = xrayMode;
    castleCtrlRef.current?.setXrayMode(xrayMode);
  }, [xrayMode]);

  useEffect(() => {
    hdRef.current = towerHdDetail;
    castleCtrlRef.current?.setTowerHDDetail(towerHdDetail);
  }, [towerHdDetail]);

  useEffect(() => {
    reconRef.current = reconstructionPct;
    castleCtrlRef.current?.setReconstructionProgress(reconstructionPct);
  }, [reconstructionPct]);

  useEffect(() => {
    markerRef.current = activeMarker;
    arSessionRef.current?.setActiveMarker(activeMarker);
  }, [activeMarker]);

  useEffect(() => {
    arLockedRef.current = arLocked;
    if (!arLocked) {
      hasLockedPoseRef.current = false;
    }
  }, [arLocked]);

  // Initialize Three.js Scene + Renderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bg3DColor = new THREE.Color(0x161210);
    const fog3D = new THREE.FogExp2(0x161210, 0.02);
    scene.background = bg3DColor;
    scene.fog = fog3D;

    // Mandatory studio environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Museum Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x4f3d2d, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.25);
    keyLight.position.set(10, 14, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 36;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 0.9);
    rimLight.position.set(-10, 8, -11);
    scene.add(rimLight);

    // Camera & OrbitControls (for 3D desk mode)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const deskCamera = new THREE.PerspectiveCamera(44, width / height, 0.1, 150);
    deskCamera.position.set(9.2, 7.6, 11.4);

    const arCamera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    arCamera.matrixAutoUpdate = false;

    const controls = new OrbitControls(deskCamera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.35, 0);
    controls.minDistance = 6.2;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minPolarAngle = 0.18;

    // Materials & Castle Model
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const materials = createCastleMaterials(maxAnisotropy, isSoftwareGl);
    const castle = buildRaciborzCastle(materials, isSoftwareGl);
    castleCtrlRef.current = castle;

    // Apply initial props
    castle.setEra(eraRef.current);
    castle.setXrayMode(xrayRef.current);
    castle.setTowerHDDetail(hdRef.current);
    castle.setReconstructionProgress(reconRef.current);

    // Hierarchy: scene -> arAnchorRoot -> castleOrientGroup -> castle.root
    const arAnchorRoot = new THREE.Group();
    scene.add(arAnchorRoot);

    const castleOrientGroup = new THREE.Group();
    arAnchorRoot.add(castleOrientGroup);
    castleOrientGroup.add(castle.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, deskCamera);
    }

    // Raycasting & Touch Swipe for AR rotation + Portcullis tap
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos: { x: number; y: number } | null = null;
    let lastSwipeX: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastSwipeX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (modeRef.current === 'ar' && lastSwipeX !== null && e.buttons > 0) {
        const dx = e.clientX - lastSwipeX;
        arYawRef.current += dx * 0.011;
        lastSwipeX = e.clientX;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      lastSwipeX = null;
      if (!pointerDownPos) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      pointerDownPos = null;

      if (dist < 10) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const activeCam = modeRef.current === 'ar' ? arCamera : deskCamera;
        raycaster.setFromCamera(pointerNdc, activeCam);

        // Check Era 1 Sleeping Dragon Easter Egg
        if (eraRef.current === 1) {
          const dragonHits = raycaster.intersectObject(castle.dragonHitProxy, false);
          if (dragonHits.length > 0) {
            if (castle.triggerDragonEasterEgg()) {
              onDragonWakeRef.current();
            }
            return;
          }
        }

        // Check Guard first (stands in front of gatehouse)
        const guardHits = raycaster.intersectObject(castle.guardHitProxy, false);
        if (guardHits.length > 0) {
          if (castle.triggerGuardShot()) {
            onGuardShotRef.current();
          }
          return;
        }

        const gateHits = raycaster.intersectObject(castle.gatehouseHitProxy, false);
        if (gateHits.length > 0 && castle.isPortcullisSupported()) {
          const opened = castle.togglePortcullis();
          onPortcullisRef.current(opened);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (modeRef.current === 'ar' && e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        if (lastSwipeX !== null) {
          arYawRef.current += (tx - lastSwipeX) * 0.012;
        }
        lastSwipeX = tx;
      }
    };

    const onTouchEnd = () => {
      lastSwipeX = null;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      deskCamera.aspect = w / h;
      deskCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // WebGL Context Loss safety
    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    // Animation loop with Software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let lastArDetected = false;
    let lastHotspotPush = 0;
    const hotspotIds: HotspotId[] = ['chapel', 'palace', 'gatehouse'];

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const dt = Math.min(delta, 0.1);
      const w = container?.clientWidth || window.innerWidth;
      const h = container?.clientHeight || window.innerHeight;

      const isAr = modeRef.current === 'ar';

      if (isAr) {
        scene.background = null;
        scene.fog = null;
        renderer.setClearColor(0x000000, 0);
        controls.enabled = false;

        // Castle lies upright on marker XY plane (+Z up -> rotate X +90 deg)
        castleOrientGroup.rotation.set(Math.PI / 2, 0, 0);
        castleOrientGroup.scale.setScalar(0.115);
        castle.root.rotation.y = arYawRef.current;

        const session = arSessionRef.current;
        if (session) {
          arCamera.projectionMatrix.copy(session.getProjectionMatrix(w, h));
          arCamera.projectionMatrixInverse.copy(arCamera.projectionMatrix).invert();

          if (arLockedRef.current && hasLockedPoseRef.current) {
            // Frozen pose on table
            arAnchorRoot.visible = true;
          } else {
            const { detected, matrix } = session.processFrame();
            if (detected !== lastArDetected) {
              lastArDetected = detected;
              onArStatusRef.current({ ready: true, detected, error: null });
            }

            if (detected) {
              matrix.decompose(_targetPos, _targetQuat, _targetScale);
              if (!hasLockedPoseRef.current) {
                _poseSmoothPos.copy(_targetPos);
                _poseSmoothQuat.copy(_targetQuat);
                hasLockedPoseRef.current = true;
              } else {
                const smoothAlpha = 1 - Math.exp(-12 * dt);
                _poseSmoothPos.lerp(_targetPos, smoothAlpha);
                _poseSmoothQuat.slerp(_targetQuat, smoothAlpha);
              }
              arAnchorRoot.position.copy(_poseSmoothPos);
              arAnchorRoot.quaternion.copy(_poseSmoothQuat);
              arAnchorRoot.scale.set(1, 1, 1);
              arAnchorRoot.visible = true;
            } else {
              arAnchorRoot.visible = false;
            }
          }
        } else {
          arAnchorRoot.visible = false;
        }
      } else {
        // 3D Desk Mode
        scene.background = bg3DColor;
        scene.fog = fog3D;
        renderer.setClearColor(bg3DColor, 1);
        controls.enabled = true;
        controls.update();

        arAnchorRoot.visible = true;
        arAnchorRoot.position.set(0, 0, 0);
        arAnchorRoot.quaternion.identity();
        arAnchorRoot.scale.set(1, 1, 1);
        castleOrientGroup.rotation.set(0, 0, 0);
        castleOrientGroup.scale.setScalar(1);
        castle.root.rotation.y = 0;
        hasLockedPoseRef.current = false;
      }

      castle.update(dt, elapsed);

      const renderCamera = isAr ? arCamera : deskCamera;
      renderer.render(scene, renderCamera);

      // Update projected 2D hotspot coordinates (~25fps max to avoid React churn)
      const nowMs = performance.now();
      if (nowMs - lastHotspotPush > 40) {
        lastHotspotPush = nowMs;
        const canShowHotspots = !isAr || arAnchorRoot.visible;
        const projected: ProjectedHotspot[] = hotspotIds.map((id) => {
          if (!canShowHotspots) {
            return { id, x: -100, y: -100, visible: false };
          }
          castle.hotspotAnchors[id].getWorldPosition(_projVec);
          _projVec.project(renderCamera);
          const inFrustum = _projVec.z >= -1 && _projVec.z <= 1;
          const sx = ((_projVec.x + 1) * 0.5) * w;
          const sy = ((-_projVec.y + 1) * 0.5) * h;
          const onScreen = inFrustum && sx > 24 && sx < w - 24 && sy > 70 && sy < h - 90;
          return {
            id,
            x: Math.round(sx),
            y: Math.round(sy),
            visible: onScreen,
          };
        });
        onHotspotsRef.current(projected);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      castle.dispose();
      materials.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Manage Camera + ARToolKit5 Session exclusively when mode === 'ar'
  useEffect(() => {
    if (mode !== 'ar') {
      if (arSessionRef.current) {
        arSessionRef.current.dispose();
        arSessionRef.current = null;
      }
      onArStatusRef.current({ ready: false, detected: false, error: null });
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;
    const session = new ArTrackerSession(videoEl);
    session.setActiveMarker(markerRef.current);
    arSessionRef.current = session;
    onArStatusRef.current({ ready: false, detected: false, error: null });

    session
      .start()
      .then(() => {
        if (!cancelled) {
          onArStatusRef.current({ ready: true, detected: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Brak dostępu do kamery. Sprawdź uprawnienia przeglądarki.';
          onArStatusRef.current({ ready: false, detected: false, error: msg });
        }
      });

    return () => {
      cancelled = true;
      session.dispose();
      if (arSessionRef.current === session) {
        arSessionRef.current = null;
      }
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#120D0C]">
      {/* Live Camera Feed for WebAR Mode */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          mode === 'ar' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-10" />
    </div>
  );
};
