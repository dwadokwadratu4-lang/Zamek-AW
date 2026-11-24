import * as THREE from 'three';
import { ChronoLayer, EraId, HotspotId } from '../types/castle';
import { CastleMaterialLibrary } from './materials';

export interface CastleController {
  root: THREE.Group;
  gatehouseHitProxy: THREE.Mesh;
  guardHitProxy: THREE.Mesh;
  dragonHitProxy: THREE.Mesh;
  hotspotAnchors: Record<HotspotId, THREE.Object3D>;
  setEra: (era: EraId) => void;
  setXrayMode: (enabled: boolean) => void;
  setTowerHDDetail: (enabled: boolean) => void;
  setReconstructionProgress: (pct: number) => void;
  togglePortcullis: () => boolean;
  isPortcullisSupported: () => boolean;
  triggerGuardShot: () => boolean;
  triggerDragonEasterEgg: () => boolean;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

function tagLayer(obj: THREE.Object3D, layer: ChronoLayer) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.userData.chronoLayer = layer;
      mesh.userData.originalMaterial = mesh.material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

function createExtrudedGableRoof(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

function createPiastFlagpole(mats: CastleMaterialLibrary, poleHeight: number): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, poleHeight, 8), mats.iron);
  pole.position.y = poleHeight / 2;
  group.add(pole);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mats.plaqueFrame);
  finial.position.y = poleHeight + 0.04;
  group.add(finial);

  // Subdivided plane so vertex flutter shader waves smoothly
  const flagGeo = new THREE.PlaneGeometry(0.95, 0.52, 12, 4);
  flagGeo.translate(0.475, 0, 0);
  const flag = new THREE.Mesh(flagGeo, mats.banner);
  flag.position.set(0.02, poleHeight - 0.3, 0);
  group.add(flag);

  return group;
}

function createLancetWindow(w: number, h: number, mats: CastleMaterialLibrary, burning = false): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, h + 0.07, 0.08), mats.stone);
  g.add(frame);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, 0.1),
    burning ? mats.fireWindow : mats.stainedGlass
  );
  glass.position.z = 0.01;
  g.add(glass);

  const arch = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.52, w * 0.65, 4),
    burning ? mats.fireWindow : mats.stainedGlass
  );
  arch.rotation.y = Math.PI / 4;
  arch.position.set(0, h / 2 + w * 0.2, 0.01);
  g.add(arch);

  return g;
}

function createBaroqueHelm(mats: CastleMaterialLibrary, ghost = false): THREE.Group {
  const g = new THREE.Group();
  const mat = ghost ? mats.laserGhost : mats.roofCopper;
  const trimMat = ghost ? mats.laserGhost : mats.plaqueFrame;

  // Onion / bell-shaped Baroque dome via LatheGeometry
  const points = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.86, 0.0),
    new THREE.Vector2(0.92, 0.25),
    new THREE.Vector2(0.75, 0.6),
    new THREE.Vector2(0.42, 0.95),
    new THREE.Vector2(0.32, 1.25),
    new THREE.Vector2(0.44, 1.45),
    new THREE.Vector2(0.18, 1.85),
    new THREE.Vector2(0.03, 2.25),
    new THREE.Vector2(0.0, 2.35),
  ];
  const domeGeo = new THREE.LatheGeometry(points, 16);
  const dome = new THREE.Mesh(domeGeo, mat);
  g.add(dome);

  // Decorative spire orb
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), trimMat);
  orb.position.y = 2.42;
  g.add(orb);

  return g;
}

export function buildRaciborzCastle(mats: CastleMaterialLibrary, isSoftwareGl: boolean): CastleController {
  const root = new THREE.Group();
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometriesToDispose.push(geo);
    return geo;
  };

  // =========================================================================
  // 1. TERRAIN MOUND, ODRA RIVER & MUSEUM PLAQUE (Always Visible)
  // =========================================================================
  const baseGroup = new THREE.Group();
  root.add(baseGroup);

  // Contact shadow disc beneath whole mound
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(15.5, 15.5)),
    mats.contactShadow
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.32;
  baseGroup.add(shadowPlane);

  // Stone base plinth
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(6.35, 6.6, 0.36, 48)),
    mats.plinthStone
  );
  plinth.position.y = -1.14;
  plinth.receiveShadow = true;
  baseGroup.add(plinth);

  // Flowing Odra river arc wrapping the northern/eastern/southern/western flank
  const riverGeo = trackGeo(new THREE.RingGeometry(4.65, 6.32, 64, 8));
  riverGeo.rotateX(-Math.PI / 2);
  const river = new THREE.Mesh(riverGeo, mats.waterOdra);
  river.position.y = -0.94;
  river.receiveShadow = true;
  baseGroup.add(river);

  // Earth embankment slope of castle hill
  const hillSlope = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.75, 5.45, 0.92, 40)),
    mats.earthBank
  );
  hillSlope.position.y = -0.5;
  hillSlope.receiveShadow = true;
  hillSlope.castShadow = true;
  baseGroup.add(hillSlope);

  // Grassy upper hill terrace
  const hillTop = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.72, 4.78, 0.16, 40)),
    mats.grassHill
  );
  hillTop.position.y = -0.06;
  hillTop.receiveShadow = true;
  baseGroup.add(hillTop);

  // Courtyard stone paving (slightly raised above grass to prevent Z-fighting)
  const courtyard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.45, 3.48, 0.05, 32)),
    mats.courtyardPaving
  );
  courtyard.position.y = 0.025;
  courtyard.receiveShadow = true;
  baseGroup.add(courtyard);

  // Instanced riverside boulders along hill edge
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.24, 0));
  const rockCount = 26;
  const rockInst = new THREE.InstancedMesh(rockGeo, mats.stone, rockCount);
  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2 + (i % 3) * 0.12;
    const radius = 5.05 + Math.sin(i * 4.2) * 0.25;
    dummy.position.set(Math.cos(angle) * radius, -0.86, Math.sin(angle) * radius);
    const s = 0.75 + (i % 5) * 0.14;
    dummy.scale.set(s * 1.2, s * 0.7, s);
    dummy.rotation.set(i * 0.7, i * 1.1, 0);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    rockColor.setHSL(0.09, 0.12, 0.45 + (i % 4) * 0.06);
    rockInst.setColorAt(i, rockColor);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  baseGroup.add(rockInst);

  // Instanced stylized low-poly trees/shrubs on outer hill bank
  const treeCount = 22;
  const foliageGeo = trackGeo(new THREE.ConeGeometry(0.32, 0.72, 7));
  const foliageInst = new THREE.InstancedMesh(foliageGeo, mats.grassHill, treeCount);
  const treeColor = new THREE.Color();
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + 0.18;
    // Keep front plaque & gate approach clear (angle near PI/2)
    if (Math.abs(Math.sin(angle) - 1) < 0.22 && Math.cos(angle) > -0.45 && Math.cos(angle) < 0.45) {
      dummy.scale.set(0.001, 0.001, 0.001);
    } else {
      const r = 4.58 + (i % 2) * 0.22;
      dummy.position.set(Math.cos(angle) * r, 0.18, Math.sin(angle) * r);
      const s = 0.85 + (i % 4) * 0.12;
      dummy.scale.set(s, s * 1.15, s);
    }
    dummy.rotation.set(0, i * 0.8, 0);
    dummy.updateMatrix();
    foliageInst.setMatrixAt(i, dummy.matrix);
    treeColor.setHSL(0.28 + (i % 3) * 0.02, 0.36, 0.28 + (i % 4) * 0.04);
    foliageInst.setColorAt(i, treeColor);
  }
  foliageInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  foliageInst.computeBoundingSphere();
  baseGroup.add(foliageInst);

  // Museum Field Plaque: "ZAMEK • RACIBÓRZ" (Single solid opaque BoxGeometry — zero Z-fighting)
  const plaqueGroup = new THREE.Group();
  plaqueGroup.position.set(0, -0.35, 5.72);
  plaqueGroup.rotation.x = -0.36;
  const plaqueBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.45, 0.92, 0.14)),
    [
      mats.plaqueFrame,
      mats.plaqueFrame,
      mats.plaqueFrame,
      mats.plaqueFrame,
      mats.plaqueFace,
      mats.plaqueFrame,
    ]
  );
  plaqueBoard.castShadow = true;
  plaqueBoard.receiveShadow = true;
  plaqueGroup.add(plaqueBoard);
  const standL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.78, 0.18)), mats.plinthStone);
  standL.position.set(-1.1, -0.60, -0.05);
  plaqueGroup.add(standL);
  const standR = standL.clone();
  standR.position.x = 1.1;
  plaqueGroup.add(standR);
  baseGroup.add(plaqueGroup);

  // =========================================================================
  // 2. ERA 1: XIII w. — GRÓD PIASTOWSKI
  // =========================================================================
  const era1Group = new THREE.Group();
  root.add(era1Group);

  // Earthen ring rampart
  const rampart = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.75, 0.34, 8, 36)),
    mats.earthBank
  );
  rampart.rotation.x = Math.PI / 2;
  rampart.position.y = 0.12;
  era1Group.add(rampart);

  // Wooden Palisade (Ostrokół) with InstancedMesh sharpened stakes (leaving south gate gap)
  const stakeCount = 84;
  const stakeGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.085, 1.35, 6));
  const stakeInst = new THREE.InstancedMesh(stakeGeo, mats.wood, stakeCount);
  for (let i = 0; i < stakeCount; i++) {
    const angle = (i / stakeCount) * Math.PI * 2;
    const gx = Math.cos(angle) * 3.72;
    const gz = Math.sin(angle) * 3.72;
    // Gate opening around +Z (x in [-0.7, 0.7], z > 3.0)
    if (gz > 3.1 && Math.abs(gx) < 0.72) {
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.position.set(0, -5, 0);
    } else {
      dummy.position.set(gx, 0.65 + (i % 3) * 0.04, gz);
      dummy.scale.set(1, 0.92 + (i % 4) * 0.05, 1);
    }
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    stakeInst.setMatrixAt(i, dummy.matrix);
  }
  stakeInst.instanceMatrix.needsUpdate = true;
  stakeInst.computeBoundingSphere();
  era1Group.add(stakeInst);

  // Wooden Watchtower at South Gate
  const watchtower = new THREE.Group();
  watchtower.position.set(0, 0, 3.35);
  const wtBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.45, 2.35, 1.35)), mats.wood);
  wtBase.position.y = 1.175;
  watchtower.add(wtBase);
  const wtGallery = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.55, 1.65)), mats.darkWood);
  wtGallery.position.y = 2.45;
  watchtower.add(wtGallery);
  const wtRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.32, 1.15, 4)), mats.darkWood);
  wtRoof.rotation.y = Math.PI / 4;
  wtRoof.position.y = 3.25;
  watchtower.add(wtRoof);
  const wtFlag = createPiastFlagpole(mats, 1.15);
  wtFlag.position.set(0, 3.75, 0);
  watchtower.add(wtFlag);
  era1Group.add(watchtower);

  // Small Romanesque Stone Chapel (XIII w. precursor on East side)
  const romChapel = new THREE.Group();
  romChapel.position.set(2.05, 0, -0.2);
  const romNave = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 1.25, 1.75)), mats.stone);
  romNave.position.y = 0.625;
  romChapel.add(romNave);
  const romApse = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.46, 0.46, 1.1, 12)),
    mats.stone
  );
  romApse.position.set(0, 0.55, -0.92);
  romChapel.add(romApse);
  const romRoof = createExtrudedGableRoof(1.28, 0.65, 1.85, mats.darkWood);
  romRoof.position.y = 1.25;
  romChapel.add(romRoof);
  era1Group.add(romChapel);

  // Timber Ducal Hall (North-West) & Courtyard Well
  const timberHall = new THREE.Group();
  timberHall.position.set(-1.65, 0, -1.35);
  timberHall.rotation.y = 0.42;
  const hallBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 1.05, 1.25)), mats.wood);
  hallBody.position.y = 0.525;
  timberHall.add(hallBody);
  const hallRoof = createExtrudedGableRoof(1.38, 0.72, 2.38, mats.darkWood);
  hallRoof.rotation.y = Math.PI / 2;
  hallRoof.position.y = 1.05;
  timberHall.add(hallRoof);
  era1Group.add(timberHall);

  const wellBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.32, 0.36, 12)), mats.stone);
  wellBase.position.set(-0.2, 0.18, 0.25);
  era1Group.add(wellBase);

  // Sleeping Green Dragon with Yellow Wings beside Timber Ducal Hall (Era 1 Easter Egg)
  const dragonGroup = new THREE.Group();
  dragonGroup.position.set(-2.48, 0.04, 0.42);
  dragonGroup.rotation.y = 0.52;
  era1Group.add(dragonGroup);

  const dragonTorsoPivot = new THREE.Group();
  dragonGroup.add(dragonTorsoPivot);

  // Curled green body & lighter green belly
  const dragonBodyMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.32, 14, 10)),
    mats.dragonGreen
  );
  dragonBodyMesh.scale.set(0.95, 0.72, 1.38);
  dragonBodyMesh.position.set(0, 0.21, -0.05);
  dragonTorsoPivot.add(dragonBodyMesh);

  const dragonBellyMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.26, 12, 8)),
    mats.dragonBelly
  );
  dragonBellyMesh.scale.set(0.82, 0.55, 1.24);
  dragonBellyMesh.position.set(0, 0.14, -0.03);
  dragonTorsoPivot.add(dragonBellyMesh);

  // Dorsal spine ridges along the back
  [-0.28, -0.12, 0.04, 0.18].forEach((rz, idx) => {
    const spike = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.042, 0.12 - idx * 0.01, 5)),
      mats.dragonHorn
    );
    spike.position.set(0, 0.44 - Math.abs(rz) * 0.16, rz);
    spike.rotation.x = -0.25;
    dragonTorsoPivot.add(spike);
  });

  // Curled tail wrapping gently to the right side
  const tailSegments = [
    { x: -0.08, y: 0.14, z: -0.46, r: 0.14, ry: -0.35 },
    { x: -0.24, y: 0.11, z: -0.58, r: 0.11, ry: -0.95 },
    { x: -0.44, y: 0.09, z: -0.54, r: 0.085, ry: -1.65 },
    { x: -0.56, y: 0.08, z: -0.36, r: 0.06, ry: -2.2 },
  ];
  tailSegments.forEach((ts) => {
    const seg = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(ts.r, 10, 8)),
      mats.dragonGreen
    );
    seg.scale.set(0.9, 0.75, 1.45);
    seg.position.set(ts.x, ts.y, ts.z);
    seg.rotation.y = ts.ry;
    dragonTorsoPivot.add(seg);
  });
  const tailTip = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.055, 0.16, 4)),
    mats.dragonHorn
  );
  tailTip.position.set(-0.62, 0.09, -0.24);
  tailTip.rotation.set(Math.PI / 2, 0, 0.55);
  dragonTorsoPivot.add(tailTip);

  // Four resting paws (front paws stretched forward as pillow for sleeping head)
  const pawPositions: Array<{ x: number; z: number; sx: number; sz: number }> = [
    { x: -0.18, z: 0.44, sx: 0.09, sz: 0.18 },
    { x: 0.18, z: 0.44, sx: 0.09, sz: 0.18 },
    { x: -0.27, z: -0.18, sx: 0.11, sz: 0.14 },
    { x: 0.27, z: -0.18, sx: 0.11, sz: 0.14 },
  ];
  pawPositions.forEach((pp) => {
    const paw = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(pp.sx * 1.6, 0.08, pp.sz * 1.5)),
      mats.dragonGreen
    );
    paw.position.set(pp.x, 0.04, pp.z);
    dragonGroup.add(paw);
  });

  // Prominent Yellow / Golden Dragon Wings (left & right articulated pivots)
  const dragonWingShape = new THREE.Shape();
  dragonWingShape.moveTo(0, 0);
  dragonWingShape.lineTo(0.28, 0.52);
  dragonWingShape.lineTo(0.68, 0.46);
  dragonWingShape.quadraticCurveTo(0.56, 0.28, 0.62, 0.12);
  dragonWingShape.quadraticCurveTo(0.42, 0.18, 0.36, -0.02);
  dragonWingShape.quadraticCurveTo(0.2, 0.08, 0.06, -0.08);
  dragonWingShape.closePath();

  const dragonWingGeo = trackGeo(
    new THREE.ExtrudeGeometry(dragonWingShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    })
  );

  const wingArmGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.032, 0.58, 6));

  const leftDragonWingPivot = new THREE.Group();
  leftDragonWingPivot.position.set(-0.14, 0.34, 0.04);
  dragonTorsoPivot.add(leftDragonWingPivot);

  const leftWingMembrane = new THREE.Mesh(dragonWingGeo, mats.dragonWingYellow);
  leftWingMembrane.rotation.y = Math.PI;
  leftWingMembrane.rotation.z = -0.18;
  leftDragonWingPivot.add(leftWingMembrane);

  const leftWingBone = new THREE.Mesh(wingArmGeo, mats.dragonGreen);
  leftWingBone.position.set(-0.16, 0.24, 0.01);
  leftWingBone.rotation.z = 0.52;
  leftDragonWingPivot.add(leftWingBone);

  const rightDragonWingPivot = new THREE.Group();
  rightDragonWingPivot.position.set(0.14, 0.34, 0.04);
  dragonTorsoPivot.add(rightDragonWingPivot);

  const rightWingMembrane = new THREE.Mesh(dragonWingGeo, mats.dragonWingYellow);
  rightWingMembrane.rotation.z = 0.18;
  rightDragonWingPivot.add(rightWingMembrane);

  const rightWingBone = new THREE.Mesh(wingArmGeo, mats.dragonGreen);
  rightWingBone.position.set(0.16, 0.24, 0.01);
  rightWingBone.rotation.z = -0.52;
  rightDragonWingPivot.add(rightWingBone);

  // Articulated Neck, Head, Horns, Eyes & Opening Jaw
  const dragonNeckPivot = new THREE.Group();
  dragonNeckPivot.position.set(0, 0.19, 0.24);
  dragonGroup.add(dragonNeckPivot);

  const dragonNeckMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11, 0.15, 0.34, 10)),
    mats.dragonGreen
  );
  dragonNeckMesh.position.set(0, 0.08, 0.08);
  dragonNeckMesh.rotation.x = 0.65;
  dragonNeckPivot.add(dragonNeckMesh);

  const dragonHeadGroup = new THREE.Group();
  dragonHeadGroup.position.set(0, 0.15, 0.25);
  dragonNeckPivot.add(dragonHeadGroup);

  const dragonSkull = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.26)),
    mats.dragonGreen
  );
  dragonSkull.position.set(0, 0.04, 0);
  dragonHeadGroup.add(dragonSkull);

  const dragonUpperSnout = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.17, 0.09, 0.22)),
    mats.dragonGreen
  );
  dragonUpperSnout.position.set(0, 0.02, 0.19);
  dragonHeadGroup.add(dragonUpperSnout);

  // Golden-horned brow & back horns
  [-0.085, 0.085].forEach((hx) => {
    const horn = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.032, 0.19, 6)),
      mats.dragonHorn
    );
    horn.position.set(hx, 0.14, -0.09);
    horn.rotation.x = -0.82;
    horn.rotation.z = hx < 0 ? 0.18 : -0.18;
    dragonHeadGroup.add(horn);

    const eye = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.028, 8, 6)),
      mats.guardGold
    );
    eye.position.set(hx * 1.25, 0.06, 0.08);
    dragonHeadGroup.add(eye);
  });

  // Articulated lower jaw (opens when roaring/breathing fire)
  const dragonJawPivot = new THREE.Group();
  dragonJawPivot.position.set(0, -0.02, 0.04);
  dragonHeadGroup.add(dragonJawPivot);

  const dragonLowerJaw = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.15, 0.055, 0.24)),
    mats.dragonBelly
  );
  dragonLowerJaw.position.set(0, -0.02, 0.13);
  dragonJawPivot.add(dragonLowerJaw);

  // Invisible mouth tip emitter & aim target for fire stream
  const dragonMouthEmitter = new THREE.Object3D();
  dragonMouthEmitter.position.set(0, 0.0, 0.31);
  dragonHeadGroup.add(dragonMouthEmitter);

  const dragonMouthAimTarget = new THREE.Object3D();
  dragonMouthAimTarget.position.set(0, -0.04, 1.31);
  dragonHeadGroup.add(dragonMouthAimTarget);

  tagLayer(era1Group, 'xiii');

  // Dragon Hit Proxy (added AFTER tagLayer so RTG X-ray never exposes invisible hit box)
  const dragonHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.35, 1.05, 1.45)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dragonHitProxy.position.set(0, 0.45, 0.1);
  dragonHitProxy.layers.set(1);
  dragonGroup.add(dragonHitProxy);

  // Dragon Fire Breath Particle System & Glow Light (inside dragonGroup)
  const dragonFireCount = isSoftwareGl ? 44 : 88;
  const dfPos = new Float32Array(dragonFireCount * 3);
  const dfCol = new Float32Array(dragonFireCount * 3);
  const dfMeta = Array.from({ length: dragonFireCount }, (_, i) => ({
    life: i / dragonFireCount,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.35) * 0.45,
    vz: (Math.random() - 0.5) * 0.45,
    speed: 1.55 + Math.random() * 1.15,
    isSpark: i % 5 === 0,
  }));

  const dfGeo = trackGeo(new THREE.BufferGeometry());
  dfGeo.setAttribute('position', new THREE.BufferAttribute(dfPos, 3));
  dfGeo.setAttribute('color', new THREE.BufferAttribute(dfCol, 3));

  const dfMat = new THREE.PointsMaterial({
    size: 0.38,
    map: mats.smokeTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const dragonFirePoints = new THREE.Points(dfGeo, dfMat);
  dragonFirePoints.frustumCulled = false;
  dragonFirePoints.visible = false;
  dragonGroup.add(dragonFirePoints);

  const dragonFireLight = new THREE.PointLight(0xff5a00, 0, 6.2, 1.6);
  dragonFireLight.position.set(0, 0.85, 0.95);
  dragonGroup.add(dragonFireLight);

  // =========================================================================
  // 3. SHARED GOTHIC & BAROQUE STRUCTURES (ERAS 2, 3, 4)
  // =========================================================================

  // --- A. Gothic Curtain Walls & Battlements (Era 2 & 3, partially preserved in 4) ---
  const curtainWallsGroup = new THREE.Group();
  root.add(curtainWallsGroup);

  const wallSegments = [
    { x: -3.25, z: 0.4, w: 0.38, d: 3.8, ry: 0.15 },
    { x: 3.18, z: 0.85, w: 0.38, d: 3.1, ry: -0.22 },
    { x: -1.85, z: 2.85, w: 2.35, d: 0.38, ry: -0.45 },
    { x: 1.75, z: 2.85, w: 2.25, d: 0.38, ry: 0.45 },
    { x: 0.25, z: -3.3, w: 3.4, d: 0.38, ry: 0.05 },
  ];
  wallSegments.forEach((seg) => {
    const wg = new THREE.Group();
    wg.position.set(seg.x, 0, seg.z);
    wg.rotation.y = seg.ry;
    const wall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(seg.w, 1.65, seg.d)), mats.brick);
    wall.position.y = 0.825;
    wg.add(wall);

    // Battlement merlons along top
    const isLongZ = seg.d > seg.w;
    const len = isLongZ ? seg.d : seg.w;
    const merlonCount = Math.max(3, Math.floor(len / 0.55));
    for (let m = 0; m < merlonCount; m++) {
      const offset = -len / 2 + (m + 0.5) * (len / merlonCount);
      const merlon = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(isLongZ ? seg.w : 0.28, 0.32, isLongZ ? 0.28 : seg.d)),
        mats.brick
      );
      merlon.position.set(isLongZ ? 0 : offset, 1.81, isLongZ ? offset : 0);
      wg.add(merlon);
    }
    curtainWallsGroup.add(wg);
  });

  // Corner Northeast Bastion Tower
  const bastion = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.74, 2.6, 14)), mats.brick);
  bastion.position.set(2.55, 1.3, -2.55);
  curtainWallsGroup.add(bastion);
  const bastionCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.78, 1.15, 14)), mats.roofGothic);
  bastionCone.position.set(2.55, 3.15, -2.55);
  curtainWallsGroup.add(bastionCone);
  tagLayer(curtainWallsGroup, 'xv');

  // --- B. Gothic Chapel of St. Thomas Becket (East Wing, Eras 2, 3, 4) ---
  const chapelGroup = new THREE.Group();
  chapelGroup.position.set(2.08, 0, -0.32);
  root.add(chapelGroup);

  const chapelBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 2.25, 2.85)), mats.brick);
  chapelBody.position.y = 1.125;
  chapelGroup.add(chapelBody);

  // Polygonal Gothic Apse
  const chapelApse = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.76, 0.78, 2.22, 6)), mats.brick);
  chapelApse.position.set(0, 1.11, -1.55);
  chapelGroup.add(chapelApse);

  // Steep Gothic Pitched Roof + Apse Roof
  const chapelRoof = createExtrudedGableRoof(1.74, 1.45, 2.98, mats.roofGothic);
  chapelRoof.position.y = 2.25;
  chapelGroup.add(chapelRoof);

  const apseRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.84, 1.35, 6)), mats.roofGothic);
  apseRoof.position.set(0, 2.89, -1.55);
  chapelGroup.add(apseRoof);

  // Bell Fleche (Sygnaturka)
  const flecheBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 0.85, 6)), mats.roofCopper);
  flecheBase.position.set(0, 3.85, -0.45);
  chapelGroup.add(flecheBase);
  const flecheSpire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.19, 0.95, 6)), mats.roofCopper);
  flecheSpire.position.set(0, 4.7, -0.45);
  chapelGroup.add(flecheSpire);

  // Exterior Gothic Stone Buttresses (Przypory)
  [-0.95, 0, 0.95].forEach((zOff) => {
    [-0.86, 0.86].forEach((xSide) => {
      const buttress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 1.9, 0.28)), mats.stone);
      buttress.position.set(xSide, 0.95, zOff);
      chapelGroup.add(buttress);
    });
  });

  // Lancet Stained-Glass Windows
  [-0.55, 0.55].forEach((zOff) => {
    const winL = createLancetWindow(0.26, 0.9, mats);
    winL.rotation.y = -Math.PI / 2;
    winL.position.set(-0.78, 1.28, zOff);
    chapelGroup.add(winL);

    const winR = createLancetWindow(0.26, 0.9, mats);
    winR.rotation.y = Math.PI / 2;
    winR.position.set(0.78, 1.28, zOff);
    chapelGroup.add(winR);
  });

  // Rose window on south facade
  const roseRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.28, 0.05, 8, 16)), mats.stone);
  roseRing.position.set(0, 1.72, 1.44);
  chapelGroup.add(roseRing);
  const roseGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.26, 16)), mats.stainedGlass);
  roseGlass.position.set(0, 1.72, 1.45);
  chapelGroup.add(roseGlass);
  tagLayer(chapelGroup, 'xv');

  // --- C. Gatehouse & Tower + Interactive Portcullis (South, Eras 2, 3, 4) ---
  const gatehouseGroup = new THREE.Group();
  gatehouseGroup.position.set(0, 0, 3.05);
  root.add(gatehouseGroup);

  // Left and right arched piers creating real walkable gate passage
  const pierL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 2.25, 1.55)), mats.brick);
  pierL.position.set(-0.88, 1.125, 0);
  gatehouseGroup.add(pierL);

  const pierR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 2.25, 1.55)), mats.brick);
  pierR.position.set(0.88, 1.125, 0);
  gatehouseGroup.add(pierR);

  // Upper Gatehouse Hall above archway
  const gateUpper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.48, 1.15, 1.55)), mats.brick);
  gateUpper.position.set(0, 2.25, 0);
  gatehouseGroup.add(gateUpper);

  // Tall Gothic Gate Tower rising on left/center
  const gateTower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.52, 2.05, 1.48)), mats.brick);
  gateTower.position.set(0, 3.65, 0);
  gatehouseGroup.add(gateTower);

  // Stone trim belt & machicolation cornice
  const towerCornice = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.24, 1.68)), mats.stone);
  towerCornice.position.set(0, 4.65, 0);
  gatehouseGroup.add(towerCornice);

  // Interactive Iron Portcullis (Brona)
  const portcullisGroup = new THREE.Group();
  portcullisGroup.position.set(0, 0.05, 0.62);
  const barMat = mats.iron;
  for (let bx = -0.42; bx <= 0.42; bx += 0.21) {
    const vBar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.48, 6)), barMat);
    vBar.position.set(bx, 0.74, 0);
    portcullisGroup.add(vBar);
  }
  for (let by = 0.28; by <= 1.32; by += 0.34) {
    const hBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 0.06, 0.06)), barMat);
    hBar.position.set(0, by, 0);
    portcullisGroup.add(hBar);
  }
  gatehouseGroup.add(portcullisGroup);

  // Raycast proxy box for easy clicking/tapping on the Gatehouse
  const gatehouseHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 5.2, 2.1)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gatehouseHitProxy.position.set(0, 2.5, 0);
  gatehouseHitProxy.layers.set(1);
  gatehouseGroup.add(gatehouseHitProxy);

  // High-Detail PBR Showcase Front Facade on the Gatehouse Tower (Toggleable ON/OFF)
  const towerHDGroup = new THREE.Group();
  gatehouseGroup.add(towerHDGroup);

  const hdFrontPanel = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.52, 2.02)),
    mats.gateTowerHD
  );
  hdFrontPanel.position.set(0, 3.65, 0.768);
  hdFrontPanel.castShadow = true;
  hdFrontPanel.receiveShadow = true;
  towerHDGroup.add(hdFrontPanel);

  // 3D Profiled Stone Window Sill & Jambs around the HD Lancet Window
  const hdSill = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.06, 0.09)), mats.stone);
  hdSill.position.set(0, 3.68, 0.785);
  towerHDGroup.add(hdSill);

  [-0.2, 0.2].forEach((jx) => {
    const jamb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.6, 0.07)), mats.stone);
    jamb.position.set(jx, 3.98, 0.78);
    towerHDGroup.add(jamb);
  });

  // 3D Sculpted Stone Heraldic Shield (Golden Upper Silesian Eagle on Blue Field)
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0, 3.12, 0.778);
  towerHDGroup.add(shieldGroup);

  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-0.24, 0.28);
  shieldShape.lineTo(0.24, 0.28);
  shieldShape.lineTo(0.24, -0.02);
  shieldShape.quadraticCurveTo(0.22, -0.24, 0, -0.34);
  shieldShape.quadraticCurveTo(-0.22, -0.24, -0.24, -0.02);
  shieldShape.closePath();

  const shieldBodyGeo = trackGeo(
    new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
  );
  const shieldStoneRim = new THREE.Mesh(shieldBodyGeo, mats.stone);
  shieldGroup.add(shieldStoneRim);

  const shieldCrestPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.38, 0.44)),
    mats.heraldicShieldFace
  );
  shieldCrestPlane.position.set(0, 0.01, 0.094);
  shieldGroup.add(shieldCrestPlane);

  // Raised 3D golden eagle crest accent on shield
  const eagleRelief = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.075, 0)),
    mats.guardGold
  );
  eagleRelief.scale.set(1.35, 1.5, 0.35);
  eagleRelief.position.set(0, 0.02, 0.106);
  shieldGroup.add(eagleRelief);

  tagLayer(gatehouseGroup, 'xv');

  // Gothic Tower Roof (Used in Era 2 & Era 4)
  const gothicTowerRoofGroup = new THREE.Group();
  gothicTowerRoofGroup.position.set(0, 4.75, 3.05);
  const gothicSpire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.18, 1.95, 4)), mats.roofGothic);
  gothicSpire.rotation.y = Math.PI / 4;
  gothicSpire.position.y = 0.975;
  gothicTowerRoofGroup.add(gothicSpire);
  const gothicFlag = createPiastFlagpole(mats, 1.15);
  gothicFlag.position.set(0, 1.9, 0);
  gothicTowerRoofGroup.add(gothicFlag);
  root.add(gothicTowerRoofGroup);
  tagLayer(gothicTowerRoofGroup, 'xv');

  // Baroque Domed Helm (Used in Era 3)
  const baroqueTowerHelmGroup = createBaroqueHelm(mats, false);
  baroqueTowerHelmGroup.position.set(0, 4.75, 3.05);
  const baroqueFlag = createPiastFlagpole(mats, 0.9);
  baroqueFlag.position.set(0, 2.42, 0);
  baroqueTowerHelmGroup.add(baroqueFlag);
  root.add(baroqueTowerHelmGroup);
  tagLayer(baroqueTowerHelmGroup, 'xviii');

  // --- D. Ducal House (Dom Książęcy) Variants across Eras 2, 3, 4 ---

  // Era 2: Gothic Brick Ducal House + Chimney + Calm Smoke
  const palaceEra2Group = new THREE.Group();
  palaceEra2Group.position.set(-1.65, 0, -1.55);
  palaceEra2Group.rotation.y = 0.36;
  root.add(palaceEra2Group);

  const p2Body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.15, 1.95, 1.55)), mats.brick);
  p2Body.position.y = 0.975;
  palaceEra2Group.add(p2Body);

  // Courtyard timber gallery
  const p2Gallery = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.65, 0.35)), mats.darkWood);
  p2Gallery.position.set(0, 1.25, 0.92);
  palaceEra2Group.add(p2Gallery);

  const p2Roof = createExtrudedGableRoof(1.72, 1.15, 3.25, mats.roofGothic);
  p2Roof.rotation.y = Math.PI / 2;
  p2Roof.position.y = 1.95;
  palaceEra2Group.add(p2Roof);

  // Stepped Gothic Gables at both ends
  [-1.58, 1.58].forEach((gx) => {
    for (let step = 0; step < 3; step++) {
      const gStep = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.32, 1.45 - step * 0.42)),
        mats.brick
      );
      gStep.position.set(gx, 2.08 + step * 0.32, 0);
      palaceEra2Group.add(gStep);
    }
  });

  // Chimney
  const p2Chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 1.05, 0.32)), mats.brick);
  p2Chimney.position.set(0.85, 2.85, -0.2);
  palaceEra2Group.add(p2Chimney);

  tagLayer(palaceEra2Group, 'xv');

  // Era 3: Baroque Remodeled Palace Wing + Great Fire Damage
  const palaceEra3Group = new THREE.Group();
  palaceEra3Group.position.set(-1.65, 0, -1.55);
  palaceEra3Group.rotation.y = 0.36;
  root.add(palaceEra3Group);

  const p3Body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.35, 2.25, 1.72)), mats.plasterBaroque);
  p3Body.position.y = 1.125;
  palaceEra3Group.add(p3Body);

  // Classical pilasters & stone cornice
  const p3Cornice = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.48, 0.16, 1.85)), mats.stone);
  p3Cornice.position.y = 2.25;
  palaceEra3Group.add(p3Cornice);
  for (let px = -1.35; px <= 1.35; px += 0.675) {
    const pilaster = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 2.15, 0.08)), mats.stone);
    pilaster.position.set(px, 1.12, 0.87);
    palaceEra3Group.add(pilaster);
  }

  // Glowing burning windows during Great Fire!
  [-1.0, -0.33, 0.33, 1.0].forEach((wx) => {
    const bw = createLancetWindow(0.28, 0.56, mats, true);
    bw.position.set(wx, 1.48, 0.88);
    palaceEra3Group.add(bw);
    const bwLow = createLancetWindow(0.26, 0.48, mats, wx > -0.5);
    bwLow.position.set(wx, 0.68, 0.88);
    palaceEra3Group.add(bwLow);
  });

  // Partially collapsed roof (left half intact, right half collapsed with charred rafters)
  const intactRoof = createExtrudedGableRoof(1.82, 1.05, 1.55, mats.roofGothic);
  intactRoof.rotation.y = Math.PI / 2;
  intactRoof.position.set(-0.88, 2.33, 0);
  palaceEra3Group.add(intactRoof);

  // Charred exposed rafters on collapsed side
  for (let r = 0; r < 5; r++) {
    const rx = 0.15 + r * 0.34;
    const rafterL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 1.05, 0.08)), mats.charredWood);
    rafterL.position.set(rx, 2.68, -0.35);
    rafterL.rotation.x = 0.62;
    palaceEra3Group.add(rafterL);

    const rafterR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.92, 0.08)), mats.charredWood);
    rafterR.position.set(rx, 2.62, 0.35);
    rafterR.rotation.x = -0.62;
    palaceEra3Group.add(rafterR);
  }
  const ridgeCharred = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.65, 0.1, 0.1)), mats.charredWood);
  ridgeCharred.position.set(0.82, 3.05, 0);
  palaceEra3Group.add(ridgeCharred);

  // Glowing ember bed inside collapsed roof
  const emberBed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.14, 1.25)), mats.fireWindow);
  emberBed.position.set(0.8, 2.35, 0);
  palaceEra3Group.add(emberBed);

  tagLayer(palaceEra3Group, 'xviii');

  // Era 4: Contemporary Restored Ducal House / Słodownia
  const palaceEra4Group = new THREE.Group();
  palaceEra4Group.position.set(-1.65, 0, -1.55);
  palaceEra4Group.rotation.y = 0.36;
  root.add(palaceEra4Group);

  const p4Body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.22, 2.05, 1.62)), mats.plasterModern);
  p4Body.position.y = 1.025;
  palaceEra4Group.add(p4Body);

  const p4Roof = createExtrudedGableRoof(1.76, 1.12, 3.3, mats.roofModern);
  p4Roof.rotation.y = Math.PI / 2;
  p4Roof.position.y = 2.05;
  palaceEra4Group.add(p4Roof);

  [-1.0, -0.33, 0.33, 1.0].forEach((wx) => {
    const mw = createLancetWindow(0.24, 0.5, mats, false);
    mw.position.set(wx, 1.38, 0.83);
    palaceEra4Group.add(mw);
  });
  tagLayer(palaceEra4Group, 'xv');

  // =========================================================================
  // 4. ERA 4 DIGITAL LASER-SCAN GHOST RECONSTRUCTION LAYER
  // =========================================================================
  const rekoGroup = new THREE.Group();
  root.add(rekoGroup);

  // Lost Western Wing (demolished after 1858 fire)
  const ghostWestWing = new THREE.Group();
  ghostWestWing.position.set(-2.95, 0, 1.05);
  ghostWestWing.rotation.y = 0.22;
  const gwBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.42, 2.15, 2.65)), mats.laserGhost);
  gwBody.position.y = 1.075;
  ghostWestWing.add(gwBody);
  const gwRoof = createExtrudedGableRoof(1.56, 1.1, 2.74, mats.laserGhost);
  gwRoof.position.y = 2.15;
  ghostWestWing.add(gwRoof);
  rekoGroup.add(ghostWestWing);

  // Lost Northern Gallery / Connecting Wing
  const ghostNorthWing = new THREE.Group();
  ghostNorthWing.position.set(0.45, 0, -2.55);
  ghostNorthWing.rotation.y = -0.15;
  const gnBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.35, 1.95, 1.28)), mats.laserGhost);
  gnBody.position.y = 0.975;
  ghostNorthWing.add(gnBody);
  const gnRoof = createExtrudedGableRoof(1.42, 0.95, 2.42, mats.laserGhost);
  gnRoof.rotation.y = Math.PI / 2;
  gnRoof.position.y = 1.95;
  ghostNorthWing.add(gnRoof);
  rekoGroup.add(ghostNorthWing);

  // Lost Corner Bastion Spire & Historic Baroque Gate Tower Helm
  const ghostTowerHelm = createBaroqueHelm(mats, true);
  ghostTowerHelm.position.set(0, 4.78, 3.05);
  ghostTowerHelm.scale.set(1.15, 1.15, 1.15);
  rekoGroup.add(ghostTowerHelm);

  const ghostWestTurret = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.56, 0.62, 3.2, 12)),
    mats.laserGhost
  );
  ghostWestTurret.position.set(-2.95, 1.6, 2.45);
  rekoGroup.add(ghostWestTurret);
  const ghostWestTurretCone = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.68, 1.35, 12)),
    mats.laserGhost
  );
  ghostWestTurretCone.position.set(-2.95, 3.85, 2.45);
  rekoGroup.add(ghostWestTurretCone);

  tagLayer(rekoGroup, 'reko');

  // Laser Scan Horizontal Ring Sweep
  const scanRingGeo = trackGeo(new THREE.RingGeometry(3.85, 4.18, 64));
  scanRingGeo.rotateX(-Math.PI / 2);
  const scanRingMesh = new THREE.Mesh(scanRingGeo, mats.laserRing);
  scanRingMesh.position.y = 0;
  scanRingMesh.visible = false;
  root.add(scanRingMesh);

  // =========================================================================
  // 5. LIVING PARTICLES & CIRCLING BIRDS
  // =========================================================================

  // Birds (2 articulated birds circling above courtyard)
  const birdsGroup = new THREE.Group();
  root.add(birdsGroup);

  interface BirdState {
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    phase: number;
    speed: number;
    baseRadius: number;
    baseHeight: number;
    curRadius: number;
  }

  const birds: BirdState[] = [];
  const wingGeo = trackGeo(new THREE.PlaneGeometry(0.28, 0.11));
  wingGeo.translate(0.14, 0, 0);
  const bodyGeo = trackGeo(new THREE.ConeGeometry(0.045, 0.24, 5));
  bodyGeo.rotateX(Math.PI / 2);

  for (let b = 0; b < 2; b++) {
    const bg = new THREE.Group();
    const bBody = new THREE.Mesh(bodyGeo, mats.birdMat);
    bg.add(bBody);

    const lw = new THREE.Mesh(wingGeo, mats.birdMat);
    lw.rotation.x = Math.PI / 2;
    bg.add(lw);

    const rw = new THREE.Mesh(wingGeo, mats.birdMat);
    rw.rotation.x = Math.PI / 2;
    rw.scale.x = -1;
    bg.add(rw);

    birdsGroup.add(bg);
    birds.push({
      group: bg,
      leftWing: lw,
      rightWing: rw,
      phase: b * Math.PI,
      speed: b === 0 ? 0.55 : 0.42,
      baseRadius: b === 0 ? 2.85 : 3.55,
      baseHeight: b === 0 ? 5.6 : 6.25,
      curRadius: b === 0 ? 2.85 : 3.55,
    });
  }

  // Smoke & Fire Particle System (Shared Points for Era 2 Chimney Smoke & Era 3 Great Fire)
  const particleCount = isSoftwareGl ? 70 : 140;
  const pPos = new Float32Array(particleCount * 3);
  const pCol = new Float32Array(particleCount * 3);
  const pMeta = Array.from({ length: particleCount }, (_, i) => ({
    life: (i / particleCount),
    vx: (Math.random() - 0.5) * 0.25,
    vz: (Math.random() - 0.5) * 0.25,
    speed: 0.9 + Math.random() * 1.1,
    isEmber: i % 3 === 0,
  }));

  const pGeo = trackGeo(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.42,
    map: mats.smokeTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  root.add(particles);

  // Fire flickering PointLight for Era 3
  const fireLight = new THREE.PointLight(0xff5500, 0, 8.5, 1.5);
  fireLight.position.set(-1.15, 2.9, -1.45);
  root.add(fireLight);

  // =========================================================================
  // 5B. INTERACTIVE PATROLLING CASTLE GUARD (Visible in all 4 Eras)
  // =========================================================================
  const guardGroup = new THREE.Group();
  guardGroup.position.set(0, 0.02, 4.18);
  root.add(guardGroup);

  const guardBodyPivot = new THREE.Group();
  guardGroup.add(guardBodyPivot);

  // Legs pivoted at hip
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.08, 0.36, 0);
  const leftLegMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.36, 0.12)), mats.guardTrousers);
  leftLegMesh.position.y = -0.18;
  leftLegPivot.add(leftLegMesh);
  guardBodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.08, 0.36, 0);
  const rightLegMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.36, 0.12)), mats.guardTrousers);
  rightLegMesh.position.y = -0.18;
  rightLegPivot.add(rightLegMesh);
  guardBodyPivot.add(rightLegPivot);

  // Torso with Blue & Gold Piast Tunic
  const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.42, 0.2)), mats.guardTunic);
  torso.position.y = 0.56;
  guardBodyPivot.add(torso);

  const tabardTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.43, 0.215)), mats.guardGold);
  tabardTrim.position.y = 0.56;
  guardBodyPivot.add(tabardTrim);

  const belt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.06, 0.22)), mats.darkWood);
  belt.position.y = 0.42;
  guardBodyPivot.add(belt);

  // Arms & Halberd / Pike
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.21, 0.71, 0);
  const leftArmMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.34, 0.1)), mats.guardTunic);
  leftArmMesh.position.y = -0.14;
  leftArmPivot.add(leftArmMesh);
  guardBodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.21, 0.71, 0);
  const rightArmMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.34, 0.1)), mats.guardTunic);
  rightArmMesh.position.y = -0.14;
  rightArmPivot.add(rightArmMesh);

  // Halberd held by right hand
  const halberdGroup = new THREE.Group();
  halberdGroup.position.set(0, -0.22, 0.08);
  halberdGroup.rotation.x = 0.16;
  const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 1.32, 6)), mats.wood);
  shaft.position.y = 0.35;
  halberdGroup.add(shaft);
  const spearTip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.048, 0.22, 4)), mats.guardSteel);
  spearTip.position.y = 1.1;
  halberdGroup.add(spearTip);
  const axeBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.02, 0.18, 0.14)), mats.guardSteel);
  axeBlade.position.set(0, 0.92, 0.06);
  halberdGroup.add(axeBlade);
  rightArmPivot.add(halberdGroup);
  guardBodyPivot.add(rightArmPivot);

  // Head & Steel Kettle Helmet
  const guardHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.2, 0.2, 0.2)), mats.guardSkin);
  guardHead.position.y = 0.88;
  guardBodyPivot.add(guardHead);

  const helmetBrim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.19, 0.21, 0.05, 10)), mats.guardSteel);
  helmetBrim.position.y = 0.96;
  guardBodyPivot.add(helmetBrim);

  const helmetDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.135, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
    mats.guardSteel
  );
  helmetDome.position.y = 0.98;
  guardBodyPivot.add(helmetDome);

  guardBodyPivot.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Invisible generous raycast hit box on layer 1 for mobile/desktop clicks
  const guardHitProxy = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.95, 1.55, 0.95)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  guardHitProxy.position.y = 0.72;
  guardHitProxy.layers.set(1);
  guardGroup.add(guardHitProxy);

  // =========================================================================
  // 6. HOTSPOT 3D ANCHORS
  // =========================================================================
  const anchorChapel = new THREE.Object3D();
  anchorChapel.position.set(2.1, 3.65, -0.35);
  root.add(anchorChapel);

  const anchorPalace = new THREE.Object3D();
  anchorPalace.position.set(-1.65, 3.15, -1.55);
  root.add(anchorPalace);

  const anchorGatehouse = new THREE.Object3D();
  anchorGatehouse.position.set(0, 5.2, 3.05);
  root.add(anchorGatehouse);

  // =========================================================================
  // 7. STATE & SMOOTH DAMPING CONTROLLER
  // =========================================================================
  let currentEra: EraId = 2;
  let xrayEnabled = false;
  let hdDetailEnabled = true;
  let reconPct = 65;
  let portcullisOpen = false;
  let portcullisHeight = 0;

  // Guard Patrol & Knockdown State
  let guardX = 0;
  let guardDir = 1; // +1 moving right, -1 moving left
  let guardFacingYaw = Math.PI / 2;
  let guardState: 'patrol' | 'falling' | 'down' | 'rising' = 'patrol';
  let guardDownTimer = 0;
  let guardFallProgress = 0; // 0 = standing, 1 = flat on ground

  // Era 1 Dragon Easter Egg State (3 seconds awake + fire breath)
  let dragonWakeTimer = 0;
  let dragonAwakeBlend = 0; // 0 = sleeping on paws, 1 = head raised high breathing fire
  const _fireOriginLocal = new THREE.Vector3();
  const _fireTargetLocal = new THREE.Vector3();
  const _fireDirLocal = new THREE.Vector3();

  // Smooth growth targets per architectural group (0..1)
  const groupFactors = {
    era1: 0,
    walls: 1,
    chapel: 1,
    gatehouse: 1,
    gothicRoof: 1,
    baroqueHelm: 0,
    palace2: 1,
    palace3: 0,
    palace4: 0,
    reko: 0,
  };

  function setGroupTransition(group: THREE.Object3D, factor: number) {
    if (factor < 0.01) {
      group.visible = false;
      return;
    }
    group.visible = true;
    const clamped = THREE.MathUtils.clamp(factor, 0.01, 1);
    group.scale.y = clamped;
    group.position.y = (1 - clamped) * -0.15;
  }

  function applyXray(enabled: boolean) {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const layer = mesh.userData.chronoLayer as ChronoLayer | undefined;
        if (!layer || !mesh.userData.originalMaterial) return;
        mesh.material = enabled ? mats.xrayByLayer[layer] : mesh.userData.originalMaterial;
      }
    });
  }

  // Reusable math helper outside frame loop
  const _invMat = new THREE.Matrix4();

  return {
    root,
    gatehouseHitProxy,
    guardHitProxy,
    dragonHitProxy,
    hotspotAnchors: {
      chapel: anchorChapel,
      palace: anchorPalace,
      gatehouse: anchorGatehouse,
    },
    setEra: (era: EraId) => {
      currentEra = era;
    },
    setXrayMode: (enabled: boolean) => {
      xrayEnabled = enabled;
      applyXray(enabled);
    },
    setTowerHDDetail: (enabled: boolean) => {
      hdDetailEnabled = enabled;
      towerHDGroup.visible = enabled;
    },
    setReconstructionProgress: (pct: number) => {
      reconPct = THREE.MathUtils.clamp(pct, 0, 100);
    },
    togglePortcullis: () => {
      portcullisOpen = !portcullisOpen;
      return portcullisOpen;
    },
    isPortcullisSupported: () => currentEra >= 2,
    triggerGuardShot: () => {
      if (guardState === 'falling' || guardState === 'down') {
        return false;
      }
      guardState = 'falling';
      guardDownTimer = 3.0;
      return true;
    },
    triggerDragonEasterEgg: () => {
      if (currentEra !== 1 || dragonWakeTimer > 0) {
        return false;
      }
      dragonWakeTimer = 3.0;
      return true;
    },
    update: (delta: number, elapsed: number) => {
      const dt = Math.min(delta, 0.1);

      // Update shaders time uniforms
      mats.waterUniforms.uTime.value = elapsed;
      mats.bannerUniforms.uTime.value = elapsed;
      mats.laserUniforms.uTime.value = elapsed;

      // Update castle-local inverse matrix for Era 4 laser scan
      root.updateWorldMatrix(true, false);
      _invMat.copy(root.matrixWorld).invert();
      mats.laserUniforms.uCastleInvMatrix.value.copy(_invMat);

      // Era visibility targets
      const tEra1 = currentEra === 1 ? 1 : 0;
      const tWalls = currentEra === 2 || currentEra === 3 ? 1 : currentEra === 4 ? 0.55 : 0;
      const tChapel = currentEra >= 2 ? 1 : 0;
      const tGate = currentEra >= 2 ? 1 : 0;
      const tGothicRoof = currentEra === 2 || currentEra === 4 ? 1 : 0;
      const tBaroqueHelm = currentEra === 3 ? 1 : 0;
      const tPalace2 = currentEra === 2 ? 1 : 0;
      const tPalace3 = currentEra === 3 ? 1 : 0;
      const tPalace4 = currentEra === 4 ? 1 : 0;
      const tReko = currentEra === 4 && reconPct > 1 ? 1 : 0;

      const lambda = 7.5;
      groupFactors.era1 = THREE.MathUtils.damp(groupFactors.era1, tEra1, lambda, dt);
      groupFactors.walls = THREE.MathUtils.damp(groupFactors.walls, tWalls, lambda, dt);
      groupFactors.chapel = THREE.MathUtils.damp(groupFactors.chapel, tChapel, lambda, dt);
      groupFactors.gatehouse = THREE.MathUtils.damp(groupFactors.gatehouse, tGate, lambda, dt);
      groupFactors.gothicRoof = THREE.MathUtils.damp(groupFactors.gothicRoof, tGothicRoof, lambda, dt);
      groupFactors.baroqueHelm = THREE.MathUtils.damp(groupFactors.baroqueHelm, tBaroqueHelm, lambda, dt);
      groupFactors.palace2 = THREE.MathUtils.damp(groupFactors.palace2, tPalace2, lambda, dt);
      groupFactors.palace3 = THREE.MathUtils.damp(groupFactors.palace3, tPalace3, lambda, dt);
      groupFactors.palace4 = THREE.MathUtils.damp(groupFactors.palace4, tPalace4, lambda, dt);
      groupFactors.reko = THREE.MathUtils.damp(groupFactors.reko, tReko, lambda, dt);

      setGroupTransition(era1Group, groupFactors.era1);
      setGroupTransition(curtainWallsGroup, groupFactors.walls);
      setGroupTransition(chapelGroup, groupFactors.chapel);
      setGroupTransition(gatehouseGroup, groupFactors.gatehouse);
      setGroupTransition(gothicTowerRoofGroup, groupFactors.gothicRoof);
      setGroupTransition(baroqueTowerHelmGroup, groupFactors.baroqueHelm);
      setGroupTransition(palaceEra2Group, groupFactors.palace2);
      setGroupTransition(palaceEra3Group, groupFactors.palace3);
      setGroupTransition(palaceEra4Group, groupFactors.palace4);

      // Gatehouse roof height adjustment (gothicRoof/baroqueHelm sit at y=4.75)
      if (gothicTowerRoofGroup.visible) {
        gothicTowerRoofGroup.position.y = 4.75;
      }
      if (baroqueTowerHelmGroup.visible) {
        baroqueTowerHelmGroup.position.y = 4.75;
      }

      // Era 4 Reconstruction & Laser Scan Height
      const scanY = (reconPct / 100) * 7.6;
      mats.laserUniforms.uScanY.value = scanY;
      rekoGroup.visible = currentEra === 4 && reconPct > 1 && groupFactors.reko > 0.05;
      scanRingMesh.visible = currentEra === 4 && reconPct > 2 && reconPct < 99;
      if (scanRingMesh.visible) {
        scanRingMesh.position.y = scanY;
        const pulse = 1 + Math.sin(elapsed * 5.0) * 0.025;
        scanRingMesh.scale.set(pulse, 1, pulse);
      }

      // Portcullis smooth raise/lower
      const targetPortY = portcullisOpen ? 1.15 : 0.05;
      portcullisHeight = THREE.MathUtils.damp(portcullisHeight, targetPortY, 8.5, dt);
      portcullisGroup.position.y = portcullisHeight;

      // Circling Birds (fly away during Era 3 Great Fire!)
      const targetBirdScale = currentEra === 3 ? 13.5 : 1.0;
      birds.forEach((b, idx) => {
        const desiredR = b.baseRadius * targetBirdScale;
        b.curRadius = THREE.MathUtils.damp(b.curRadius, desiredR, 1.8, dt);
        const angle = elapsed * b.speed + b.phase;
        const bx = Math.cos(angle) * b.curRadius;
        const bz = Math.sin(angle) * b.curRadius;
        const by = b.baseHeight + Math.sin(elapsed * 1.4 + idx) * 0.25 + (currentEra === 3 ? 2.5 : 0);

        b.group.position.set(bx, by, bz);
        // Face tangent direction
        b.group.rotation.y = -angle;
        const flap = Math.sin(elapsed * 9.5 + idx * 1.7) * 0.55;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
        b.group.visible = b.curRadius < 12.5;
      });

      // Smoke & Fire Particles (Era 2 calm chimney smoke vs Era 3 Great Fire)
      const showSmoke = currentEra === 2 || currentEra === 3;
      particles.visible = showSmoke;
      if (showSmoke) {
        const posAttr = pGeo.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = pGeo.getAttribute('color') as THREE.BufferAttribute;

        const isFire = currentEra === 3;
        pMat.size = isFire ? 0.58 : 0.28;
        pMat.opacity = isFire ? 0.78 : 0.42;

        for (let i = 0; i < particleCount; i++) {
          const m = pMeta[i];
          m.life += dt * (isFire ? 0.55 : 0.28) * m.speed;
          if (m.life >= 1) {
            m.life = 0;
          }

          if (isFire) {
            // Rise over collapsed Baroque palace wing
            const spread = m.life * 1.25;
            const px = -1.3 + Math.sin(i * 2.1) * 0.85 + m.vx * spread * 2.4;
            const py = 2.4 + m.life * 4.4;
            const pz = -1.45 + Math.cos(i * 1.7) * 0.55 + m.vz * spread * 2.4;
            pPos[i * 3] = px;
            pPos[i * 3 + 1] = py;
            pPos[i * 3 + 2] = pz;

            if (m.isEmber && m.life < 0.48) {
              // Bright fire orange-yellow near roof
              pCol[i * 3] = 1.0;
              pCol[i * 3 + 1] = 0.45 - m.life * 0.5;
              pCol[i * 3 + 2] = 0.08;
            } else {
              // Dense dark grey smoke plume higher up
              const g = 0.22 + (1 - m.life) * 0.14;
              pCol[i * 3] = g;
              pCol[i * 3 + 1] = g * 0.95;
              pCol[i * 3 + 2] = g * 0.92;
            }
          } else {
            // Era 2 calm white chimney smoke
            const activeCount = Math.floor(particleCount * 0.35);
            if (i > activeCount) {
              pPos[i * 3] = 0;
              pPos[i * 3 + 1] = -20;
              pPos[i * 3 + 2] = 0;
            } else {
              const drift = m.life * 0.95;
              pPos[i * 3] = -0.82 + drift * 0.6 + Math.sin(elapsed + i) * 0.08;
              pPos[i * 3 + 1] = 3.38 + m.life * 1.85;
              pPos[i * 3 + 2] = -1.55 + drift * 0.3;
              pCol[i * 3] = 0.92;
              pCol[i * 3 + 1] = 0.93;
              pCol[i * 3 + 2] = 0.95;
            }
          }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      // Era 3 Fire Light Flicker
      if (currentEra === 3) {
        const flicker = 2.6 + Math.sin(elapsed * 19.0) * 0.7 + Math.cos(elapsed * 11.3) * 0.5;
        fireLight.intensity = flicker;
      } else {
        fireLight.intensity = THREE.MathUtils.damp(fireLight.intensity, 0, 8, dt);
      }

      // Guard Patrol & 3-Second Knockdown Animation (Active in all 4 Eras)
      if (guardState === 'patrol') {
        guardX += guardDir * 0.72 * dt;
        if (guardX >= 1.32) {
          guardX = 1.32;
          guardDir = -1;
        } else if (guardX <= -1.32) {
          guardX = -1.32;
          guardDir = 1;
        }
        const targetYaw = guardDir > 0 ? Math.PI / 2 : -Math.PI / 2;
        guardFacingYaw = THREE.MathUtils.damp(guardFacingYaw, targetYaw, 10, dt);

        const walkPhase = elapsed * 7.2;
        const swing = Math.sin(walkPhase) * 0.42;
        leftLegPivot.rotation.x = swing;
        rightLegPivot.rotation.x = -swing;
        leftArmPivot.rotation.x = -swing * 0.65;
        rightArmPivot.rotation.x = swing * 0.25;
        guardBodyPivot.rotation.set(0, guardFacingYaw, Math.sin(walkPhase) * 0.045);
        guardBodyPivot.position.y = Math.abs(Math.sin(walkPhase)) * 0.035;
        guardFallProgress = THREE.MathUtils.damp(guardFallProgress, 0, 10, dt);
      } else if (guardState === 'falling') {
        guardFallProgress = Math.min(1, guardFallProgress + dt * 5.8);
        guardBodyPivot.rotation.set(0, guardFacingYaw, -guardFallProgress * (Math.PI / 2));
        guardBodyPivot.position.y = guardFallProgress * 0.12;
        leftLegPivot.rotation.x = 0;
        rightLegPivot.rotation.x = 0;
        if (guardFallProgress >= 0.995) {
          guardFallProgress = 1;
          guardState = 'down';
          guardDownTimer = 3.0;
        }
      } else if (guardState === 'down') {
        guardDownTimer -= dt;
        guardBodyPivot.rotation.set(0, guardFacingYaw, -(Math.PI / 2));
        guardBodyPivot.position.y = 0.12;
        if (guardDownTimer <= 0) {
          guardState = 'rising';
        }
      } else if (guardState === 'rising') {
        guardFallProgress = Math.max(0, guardFallProgress - dt * 2.4);
        guardBodyPivot.rotation.set(0, guardFacingYaw, -guardFallProgress * (Math.PI / 2));
        guardBodyPivot.position.y = guardFallProgress * 0.12;
        if (guardFallProgress <= 0.01) {
          guardFallProgress = 0;
          guardState = 'patrol';
        }
      }

      guardGroup.position.x = guardX;

      // Era 1 Sleeping Dragon & 3-Second Fire-Breathing Animation
      if (currentEra !== 1 && dragonWakeTimer > 0) {
        dragonWakeTimer = 0;
      }
      if (dragonWakeTimer > 0) {
        dragonWakeTimer = Math.max(0, dragonWakeTimer - dt);
      }
      const isDragonAwake = dragonWakeTimer > 0;
      dragonAwakeBlend = THREE.MathUtils.damp(
        dragonAwakeBlend,
        isDragonAwake ? 1 : 0,
        isDragonAwake ? 10.5 : 5.2,
        dt
      );

      if (era1Group.visible) {
        const sleepBreath = Math.sin(elapsed * 1.9);
        const sleepScale = 1 - dragonAwakeBlend;
        dragonTorsoPivot.scale.set(
          1 + sleepBreath * 0.035 * sleepScale,
          1 + sleepBreath * 0.045 * sleepScale,
          1
        );

        // Neck & Head rise high during 3s awake phase, rest back on paws when asleep
        dragonNeckPivot.position.set(
          0,
          THREE.MathUtils.lerp(0.19, 0.62, dragonAwakeBlend) +
            (isDragonAwake ? Math.sin(elapsed * 14) * 0.015 : 0),
          THREE.MathUtils.lerp(0.24, 0.14, dragonAwakeBlend)
        );
        dragonNeckPivot.rotation.x = THREE.MathUtils.lerp(0.36, -0.46, dragonAwakeBlend);
        dragonJawPivot.rotation.x = THREE.MathUtils.lerp(
          0.02,
          0.54 + Math.sin(elapsed * 18) * 0.08,
          dragonAwakeBlend
        );

        // Yellow wings: folded neatly while asleep, flared proudly while breathing fire
        const wingFlap = isDragonAwake ? Math.sin(elapsed * 11) * 0.15 : sleepBreath * 0.02;
        leftDragonWingPivot.rotation.set(
          THREE.MathUtils.lerp(0.08, 0.24, dragonAwakeBlend),
          THREE.MathUtils.lerp(0.12, 0.48, dragonAwakeBlend),
          THREE.MathUtils.lerp(0.22, -0.68, dragonAwakeBlend) + wingFlap
        );
        rightDragonWingPivot.rotation.set(
          THREE.MathUtils.lerp(0.08, 0.24, dragonAwakeBlend),
          THREE.MathUtils.lerp(-0.12, -0.48, dragonAwakeBlend),
          THREE.MathUtils.lerp(-0.22, 0.68, dragonAwakeBlend) - wingFlap
        );

        // Fire breath stream particles from raised mouth
        const fireActive = isDragonAwake && dragonAwakeBlend > 0.25;
        dragonFirePoints.visible = fireActive;
        if (fireActive) {
          dragonGroup.updateWorldMatrix(true, true);
          dragonMouthEmitter.getWorldPosition(_fireOriginLocal);
          dragonMouthAimTarget.getWorldPosition(_fireTargetLocal);
          dragonGroup.worldToLocal(_fireOriginLocal);
          dragonGroup.worldToLocal(_fireTargetLocal);
          _fireDirLocal.subVectors(_fireTargetLocal, _fireOriginLocal).normalize();

          const dfPosAttr = dfGeo.getAttribute('position') as THREE.BufferAttribute;
          const dfColAttr = dfGeo.getAttribute('color') as THREE.BufferAttribute;

          for (let i = 0; i < dragonFireCount; i++) {
            const fm = dfMeta[i];
            fm.life += dt * fm.speed;
            if (fm.life >= 1) {
              fm.life = 0;
            }

            const dist = fm.life * 2.15;
            const coneSpread = fm.life * (fm.isSpark ? 0.92 : 0.62);
            const curlUp = fm.life * fm.life * 0.36;

            dfPos[i * 3] = _fireOriginLocal.x + _fireDirLocal.x * dist + fm.vx * coneSpread;
            dfPos[i * 3 + 1] =
              _fireOriginLocal.y + _fireDirLocal.y * dist + fm.vy * coneSpread + curlUp;
            dfPos[i * 3 + 2] = _fireOriginLocal.z + _fireDirLocal.z * dist + fm.vz * coneSpread;

            if (fm.isSpark) {
              dfCol[i * 3] = 1.0;
              dfCol[i * 3 + 1] = 0.85 - fm.life * 0.45;
              dfCol[i * 3 + 2] = 0.25 * (1 - fm.life);
            } else if (fm.life < 0.26) {
              // Bright yellow-white mouth core
              dfCol[i * 3] = 1.0;
              dfCol[i * 3 + 1] = 0.92 - fm.life * 0.6;
              dfCol[i * 3 + 2] = 0.35 * (1 - fm.life * 2.5);
            } else {
              // Vivid orange to red flame tail
              dfCol[i * 3] = 1.0 - Math.max(0, fm.life - 0.72) * 1.4;
              dfCol[i * 3 + 1] = Math.max(0.08, 0.56 - fm.life * 0.62);
              dfCol[i * 3 + 2] = 0.03;
            }
          }
          dfPosAttr.needsUpdate = true;
          dfColAttr.needsUpdate = true;

          dragonFireLight.position.set(
            _fireOriginLocal.x + _fireDirLocal.x * 0.7,
            _fireOriginLocal.y + _fireDirLocal.y * 0.7 + 0.1,
            _fireOriginLocal.z + _fireDirLocal.z * 0.7
          );
          dragonFireLight.intensity = 3.2 + Math.sin(elapsed * 26) * 0.9;
        } else {
          dragonFireLight.intensity = THREE.MathUtils.damp(dragonFireLight.intensity, 0, 12, dt);
        }
      } else {
        dragonFirePoints.visible = false;
        dragonFireLight.intensity = 0;
      }

      // Sync HD detail visibility & X-ray state
      towerHDGroup.visible = hdDetailEnabled;
      void xrayEnabled;
    },
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      pMat.dispose();
      dfMat.dispose();
      (gatehouseHitProxy.material as THREE.Material).dispose();
      (guardHitProxy.material as THREE.Material).dispose();
      (dragonHitProxy.material as THREE.Material).dispose();
    },
  };
}
