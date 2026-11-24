import * as THREE from 'three';
import { ChronoLayer } from '../types/castle';
import {
  createBrickTexture,
  createContactShadowTexture,
  createGateTowerHDTextures,
  createParticleTexture,
  createPiastBannerTexture,
  createPlaqueTexture,
  createRoofTileTexture,
  createStoneTexture,
  createWoodTexture,
} from './textures';

export interface CastleMaterialLibrary {
  brick: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  courtyardPaving: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  charredWood: THREE.MeshStandardMaterial;
  plasterBaroque: THREE.MeshStandardMaterial;
  plasterModern: THREE.MeshStandardMaterial;
  roofGothic: THREE.MeshStandardMaterial;
  roofModern: THREE.MeshStandardMaterial;
  roofCopper: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  stainedGlass: THREE.MeshPhysicalMaterial;
  fireWindow: THREE.MeshStandardMaterial;
  grassHill: THREE.MeshStandardMaterial;
  earthBank: THREE.MeshStandardMaterial;
  plinthStone: THREE.MeshStandardMaterial;
  waterOdra: THREE.MeshPhysicalMaterial;
  banner: THREE.MeshStandardMaterial;
  plaqueFace: THREE.MeshStandardMaterial;
  plaqueFrame: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  birdMat: THREE.MeshStandardMaterial;
  gateTowerHD: THREE.MeshStandardMaterial;
  heraldicShieldFace: THREE.MeshPhysicalMaterial;
  guardTunic: THREE.MeshStandardMaterial;
  guardTrousers: THREE.MeshStandardMaterial;
  guardSkin: THREE.MeshStandardMaterial;
  guardSteel: THREE.MeshStandardMaterial;
  guardGold: THREE.MeshStandardMaterial;
  dragonGreen: THREE.MeshStandardMaterial;
  dragonBelly: THREE.MeshStandardMaterial;
  dragonWingYellow: THREE.MeshStandardMaterial;
  dragonHorn: THREE.MeshStandardMaterial;
  laserGhost: THREE.MeshStandardMaterial;
  laserRing: THREE.MeshBasicMaterial;
  smokeTex: THREE.CanvasTexture;
  xrayByLayer: Record<ChronoLayer, THREE.MeshStandardMaterial>;
  waterUniforms: { uTime: { value: number } };
  bannerUniforms: { uTime: { value: number } };
  laserUniforms: { uScanY: { value: number }; uTime: { value: number }; uCastleInvMatrix: { value: THREE.Matrix4 } };
  dispose: () => void;
}

export function createCastleMaterials(maxAnisotropy: number, isSoftwareGl: boolean): CastleMaterialLibrary {
  const brickTex = createBrickTexture(maxAnisotropy, 3, 2);
  const stoneTex = createStoneTexture(maxAnisotropy, 2, 2);
  const woodTex = createWoodTexture(maxAnisotropy);
  const roofGothicTex = createRoofTileTexture(maxAnisotropy, '#8F3124');
  const roofModernTex = createRoofTileTexture(maxAnisotropy, '#9D432F');
  const bannerTex = createPiastBannerTexture(maxAnisotropy);
  const plaqueTex = createPlaqueTexture(maxAnisotropy);
  const shadowTex = createContactShadowTexture();
  const smokeTex = createParticleTexture();
  const hdTowerMaps = createGateTowerHDTextures(maxAnisotropy);

  const waterUniforms = { uTime: { value: 0 } };
  const bannerUniforms = { uTime: { value: 0 } };
  const laserUniforms = {
    uScanY: { value: 6.5 },
    uTime: { value: 0 },
    uCastleInvMatrix: { value: new THREE.Matrix4() },
  };

  const brick = new THREE.MeshStandardMaterial({
    map: brickTex,
    roughness: 0.88,
    metalness: 0.04,
  });

  const stone = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xe5dfd2,
    roughness: 0.85,
    metalness: 0.05,
  });

  const courtyardPaving = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xc2b9aa,
    roughness: 0.92,
    metalness: 0.02,
  });

  const wood = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.84,
    metalness: 0.03,
  });

  const darkWood = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x6f4b32,
    roughness: 0.88,
    metalness: 0.02,
  });

  const charredWood = new THREE.MeshStandardMaterial({
    color: 0x221b18,
    emissive: 0x7a1c00,
    emissiveIntensity: 0.55,
    roughness: 0.95,
    metalness: 0.05,
  });

  const plasterBaroque = new THREE.MeshStandardMaterial({
    color: 0xf4e3bd,
    roughness: 0.72,
    metalness: 0.02,
  });

  const plasterModern = new THREE.MeshStandardMaterial({
    color: 0xe8dfd0,
    roughness: 0.78,
    metalness: 0.03,
  });

  const roofGothic = new THREE.MeshStandardMaterial({
    map: roofGothicTex,
    roughness: 0.74,
    metalness: 0.06,
  });

  const roofModern = new THREE.MeshStandardMaterial({
    map: roofModernTex,
    roughness: 0.68,
    metalness: 0.08,
  });

  const roofCopper = new THREE.MeshStandardMaterial({
    color: 0x458071,
    roughness: 0.42,
    metalness: 0.55,
  });

  const iron = new THREE.MeshStandardMaterial({
    color: 0x2f3338,
    roughness: 0.35,
    metalness: 0.85,
  });

  const stainedGlass = new THREE.MeshPhysicalMaterial({
    color: 0x5c89b8,
    emissive: 0x284b7a,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
  });

  const fireWindow = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0xff4500,
    emissiveIntensity: 2.2,
    roughness: 0.3,
    metalness: 0.0,
  });

  const grassHill = new THREE.MeshStandardMaterial({
    color: 0x4f6d3a,
    roughness: 0.94,
    metalness: 0.0,
  });

  const earthBank = new THREE.MeshStandardMaterial({
    color: 0x705841,
    roughness: 0.95,
    metalness: 0.0,
  });

  const plinthStone = new THREE.MeshStandardMaterial({
    color: 0x423b35,
    roughness: 0.82,
    metalness: 0.12,
  });

  // Animated Odra river material via onBeforeCompile
  const waterOdra = new THREE.MeshPhysicalMaterial({
    color: 0x1d6896,
    roughness: isSoftwareGl ? 0.25 : 0.12,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  waterOdra.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float wave = sin(position.x * 1.4 + uTime * 2.1) * 0.035 + cos(position.z * 1.8 - uTime * 1.7) * 0.025;
        transformed.y += wave;`
      );
  };

  // Animated waving Piast banner via onBeforeCompile
  const banner = new THREE.MeshStandardMaterial({
    map: bannerTex,
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.05,
  });
  banner.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = bannerUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float distFromPole = clamp(uv.x, 0.0, 1.0);
        float flutter = sin(uv.x * 9.0 - uTime * 5.2 + uv.y * 2.0) * 0.09 * distFromPole;
        transformed.z += flutter;
        transformed.y += cos(uv.x * 7.0 - uTime * 4.5) * 0.025 * distFromPole;`
      );
  };

  const plaqueFace = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    transparent: false,
    roughness: 0.42,
    metalness: 0.45,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const plaqueFrame = new THREE.MeshStandardMaterial({
    color: 0xb99335,
    roughness: 0.28,
    metalness: 0.88,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });

  const birdMat = new THREE.MeshStandardMaterial({
    color: 0x23201e,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // High-Detail PBR Gatehouse Tower Wall (1024x1024 color + bump + roughness)
  const gateTowerHD = new THREE.MeshStandardMaterial({
    map: hdTowerMaps.map,
    bumpMap: hdTowerMaps.bumpMap,
    bumpScale: 0.048,
    roughnessMap: hdTowerMaps.roughnessMap,
    roughness: 1.0,
    metalness: 0.06,
    transparent: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const heraldicShieldFace = new THREE.MeshPhysicalMaterial({
    map: hdTowerMaps.shieldMap,
    roughness: 0.34,
    metalness: 0.25,
    clearcoat: 0.65,
    clearcoatRoughness: 0.22,
    transparent: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Castle Guard Materials
  const guardTunic = new THREE.MeshStandardMaterial({
    color: 0x1e40af,
    roughness: 0.72,
    metalness: 0.05,
  });

  const guardTrousers = new THREE.MeshStandardMaterial({
    color: 0x3b2618,
    roughness: 0.85,
    metalness: 0.02,
  });

  const guardSkin = new THREE.MeshStandardMaterial({
    color: 0xe6b89c,
    roughness: 0.68,
    metalness: 0.0,
  });

  const guardSteel = new THREE.MeshStandardMaterial({
    color: 0xb8c2cc,
    roughness: 0.24,
    metalness: 0.88,
  });

  const guardGold = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.28,
    metalness: 0.82,
  });

  // Era 1 Sleeping Dragon Materials
  const dragonGreen = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.56,
    metalness: 0.08,
  });

  const dragonBelly = new THREE.MeshStandardMaterial({
    color: 0x81c784,
    roughness: 0.68,
    metalness: 0.03,
  });

  const dragonWingYellow = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x854d0e,
    emissiveIntensity: 0.14,
    roughness: 0.42,
    metalness: 0.18,
    side: THREE.DoubleSide,
  });

  const dragonHorn = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.38,
    metalness: 0.12,
  });

  // Era 4 Holographic Laser-Scan Ghost Material
  const laserGhost = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0xd4af37,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.3,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  laserGhost.onBeforeCompile = (shader) => {
    shader.uniforms.uScanY = laserUniforms.uScanY;
    shader.uniforms.uTime = laserUniforms.uTime;
    shader.uniforms.uCastleInvMatrix = laserUniforms.uCastleInvMatrix;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform mat4 uCastleInvMatrix;
        varying float vCastleY;`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        vec4 localToCastle = uCastleInvMatrix * wp;
        vCastleY = localToCastle.y;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uScanY;
        uniform float uTime;
        varying float vCastleY;`
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (vCastleY > uScanY) discard;
        float distToScan = abs(uScanY - vCastleY);
        float scanLine = smoothstep(0.24, 0.0, distToScan);
        float gridPulse = 0.85 + 0.15 * sin(vCastleY * 14.0 - uTime * 3.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb * gridPulse, vec3(1.0, 0.85, 0.25), scanLine * 0.95);
        gl_FragColor.a = clamp(gl_FragColor.a + scanLine * 0.55, 0.0, 0.95);`
      );
  };

  const laserRing = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Chronological RTG X-ray materials
  const makeXray = (hex: number) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity: 0.72,
      depthWrite: true,
    });

  const xrayByLayer: Record<ChronoLayer, THREE.MeshStandardMaterial> = {
    xiii: makeXray(0x22c55e),
    xv: makeXray(0xea580c),
    xviii: makeXray(0x2563eb),
    reko: makeXray(0xeab308),
  };

  const allMaterials: THREE.Material[] = [
    brick,
    stone,
    courtyardPaving,
    wood,
    darkWood,
    charredWood,
    plasterBaroque,
    plasterModern,
    roofGothic,
    roofModern,
    roofCopper,
    iron,
    stainedGlass,
    fireWindow,
    grassHill,
    earthBank,
    plinthStone,
    waterOdra,
    banner,
    plaqueFace,
    plaqueFrame,
    contactShadow,
    birdMat,
    gateTowerHD,
    heraldicShieldFace,
    guardTunic,
    guardTrousers,
    guardSkin,
    guardSteel,
    guardGold,
    dragonGreen,
    dragonBelly,
    dragonWingYellow,
    dragonHorn,
    laserGhost,
    laserRing,
    ...Object.values(xrayByLayer),
  ];

  const allTextures: THREE.Texture[] = [
    brickTex,
    stoneTex,
    woodTex,
    roofGothicTex,
    roofModernTex,
    bannerTex,
    plaqueTex,
    shadowTex,
    smokeTex,
    hdTowerMaps.map,
    hdTowerMaps.bumpMap,
    hdTowerMaps.roughnessMap,
    hdTowerMaps.shieldMap,
  ];

  return {
    brick,
    stone,
    courtyardPaving,
    wood,
    darkWood,
    charredWood,
    plasterBaroque,
    plasterModern,
    roofGothic,
    roofModern,
    roofCopper,
    iron,
    stainedGlass,
    fireWindow,
    grassHill,
    earthBank,
    plinthStone,
    waterOdra,
    banner,
    plaqueFace,
    plaqueFrame,
    contactShadow,
    birdMat,
    gateTowerHD,
    heraldicShieldFace,
    guardTunic,
    guardTrousers,
    guardSkin,
    guardSteel,
    guardGold,
    dragonGreen,
    dragonBelly,
    dragonWingYellow,
    dragonHorn,
    laserGhost,
    laserRing,
    smokeTex,
    xrayByLayer,
    waterUniforms,
    bannerUniforms,
    laserUniforms,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
      allTextures.forEach((t) => t.dispose());
    },
  };
}
