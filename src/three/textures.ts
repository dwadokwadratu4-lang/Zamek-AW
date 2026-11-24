import * as THREE from 'three';

function configureColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

function configureDataTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createBrickTexture(anisotropy: number, repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#B8A99A';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 16;
  const cols = 8;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 0.85 + Math.sin(r * 7.3 + c * 13.7) * 0.15;
      const red = Math.round(146 * shade);
      const green = Math.round(58 * shade);
      const blue = Math.round(42 * shade);
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(c * cw + offset + 1.5, r * rh + 1.5, cw - 3, rh - 3);
    }
  }

  return configureColorTexture(canvas, anisotropy, repeatX, repeatY);
}

/**
 * High-Detail 1024x1024 PBR texture suite for the front face of the Gatehouse Tower:
 * - Old irregular Gothic brick with lime mortar & patina
 * - Profiled stone lancet window frame
 * - Synchronized bumpMap & roughnessMap
 */
export function createGateTowerHDTextures(anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  shieldMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const cColor = document.createElement('canvas');
  const cBump = document.createElement('canvas');
  const cRough = document.createElement('canvas');
  cColor.width = cBump.width = cRough.width = size;
  cColor.height = cBump.height = cRough.height = size;

  const ctxC = cColor.getContext('2d')!;
  const ctxB = cBump.getContext('2d')!;
  const ctxR = cRough.getContext('2d')!;

  // 1. Irregular lime mortar base
  ctxC.fillStyle = '#B5A897';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#404040'; // Recessed mortar
  ctxB.fillRect(0, 0, size, size);
  ctxR.fillStyle = '#EBEBEB'; // Matte mortar (~0.92 roughness)
  ctxR.fillRect(0, 0, size, size);

  // Subtle mortar grain noise
  for (let i = 0; i < 4000; i++) {
    const nx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const ny = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const px = Math.abs(nx) * size;
    const py = Math.abs(ny) * size;
    ctxC.fillStyle = i % 2 === 0 ? 'rgba(90,75,60,0.12)' : 'rgba(235,225,210,0.12)';
    ctxC.fillRect(px, py, 3, 3);
    ctxB.fillStyle = i % 2 === 0 ? 'rgba(30,30,30,0.25)' : 'rgba(110,110,110,0.2)';
    ctxB.fillRect(px, py, 3, 3);
  }

  // 2. Old Gothic brick courses (Wątek polski / gothic irregular courses)
  const rows = 36;
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const isHeaderRow = r % 3 === 1;
    const cols = isHeaderRow ? 22 : 13;
    const cw = size / cols;
    const rowOffset = (r % 2) * (cw * 0.45);

    for (let c = -1; c <= cols + 1; c++) {
      const seed = r * 31.7 + c * 17.3;
      const hash = Math.abs(Math.sin(seed * 12.345));
      const jitterX = (Math.sin(seed * 3.1) * 3.5);
      const jitterY = (Math.cos(seed * 2.7) * 1.6);
      const bx = c * cw + rowOffset + jitterX + 3;
      const by = r * rh + jitterY + 2.5;
      const bw = cw - 6 + Math.sin(seed) * 2;
      const bh = rh - 5;

      // Brick albedo color variation (warm terracotta, burnt sienna, dark clinker)
      let red = 138 + Math.round(Math.sin(seed * 1.9) * 26);
      let green = 52 + Math.round(Math.cos(seed * 2.3) * 14);
      let blue = 36 + Math.round(Math.sin(seed * 4.1) * 10);
      if (hash > 0.86) {
        // Dark overfired clinker brick
        red = Math.round(red * 0.62);
        green = Math.round(green * 0.62);
        blue = Math.round(blue * 0.65);
      }

      ctxC.fillStyle = `rgb(${red},${green},${blue})`;
      ctxC.beginPath();
      ctxC.roundRect(bx, by, bw, bh, 3);
      ctxC.fill();

      // Brick face micro-pitting
      ctxC.fillStyle = 'rgba(255,220,190,0.08)';
      ctxC.fillRect(bx + 2, by + 2, bw - 4, bh * 0.3);

      // Bump height per brick (varied protrusion)
      const bumpVal = 175 + Math.round(Math.sin(seed * 5.2) * 38);
      ctxB.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      ctxB.beginPath();
      ctxB.roundRect(bx, by, bw, bh, 3);
      ctxB.fill();

      // Roughness per brick (0.72 - 0.88)
      const roughVal = 185 + Math.round(Math.cos(seed * 3.8) * 25);
      ctxR.fillStyle = `rgb(${roughVal},${roughVal},${roughVal})`;
      ctxR.fillRect(bx, by, bw, bh);
    }
  }

  // 3. Weathering patina & moisture streaks from top cornice & bottom base
  const topPatina = ctxC.createLinearGradient(0, 0, 0, size * 0.22);
  topPatina.addColorStop(0, 'rgba(38, 42, 30, 0.42)');
  topPatina.addColorStop(1, 'rgba(38, 42, 30, 0)');
  ctxC.fillStyle = topPatina;
  ctxC.fillRect(0, 0, size, size * 0.22);

  const botPatina = ctxC.createLinearGradient(0, size * 0.8, 0, size);
  botPatina.addColorStop(0, 'rgba(42, 48, 32, 0)');
  botPatina.addColorStop(1, 'rgba(38, 46, 28, 0.45)');
  ctxC.fillStyle = botPatina;
  ctxC.fillRect(0, size * 0.8, size, size * 0.2);

  // 4. Profiled Gothic Stone Lancet Window (upper center: y = 140..440)
  const wx = size / 2;
  const wyTop = 145;
  const wyBot = 445;
  const wHalf = 82;

  const drawWindowPath = (ctx: CanvasRenderingContext2D, expand: number) => {
    const hw = wHalf + expand;
    const archStart = wyTop + 88;
    ctx.beginPath();
    ctx.moveTo(wx - hw, wyBot + expand);
    ctx.lineTo(wx - hw, archStart);
    ctx.quadraticCurveTo(wx - hw, wyTop - expand, wx, wyTop - expand * 1.4);
    ctx.quadraticCurveTo(wx + hw, wyTop - expand, wx + hw, archStart);
    ctx.lineTo(wx + hw, wyBot + expand);
    ctx.closePath();
  };

  // Outer carved limestone surround
  drawWindowPath(ctxC, 30);
  ctxC.fillStyle = '#D6CEBF';
  ctxC.fill();
  ctxC.lineWidth = 6;
  ctxC.strokeStyle = '#8F8474';
  ctxC.stroke();

  drawWindowPath(ctxB, 30);
  ctxB.fillStyle = '#E8E8E8'; // Raised stone molding
  ctxB.fill();

  drawWindowPath(ctxR, 30);
  ctxR.fillStyle = '#A8A8A8'; // Smooth carved stone
  ctxR.fill();

  // Inner stepped stone bevel
  drawWindowPath(ctxC, 12);
  ctxC.fillStyle = '#B8AF9F';
  ctxC.fill();

  drawWindowPath(ctxB, 12);
  ctxB.fillStyle = '#B0B0B0';
  ctxB.fill();

  // Window sill
  ctxC.fillStyle = '#C9C0B0';
  ctxC.fillRect(wx - wHalf - 40, wyBot - 4, (wHalf + 40) * 2, 28);
  ctxB.fillStyle = '#FFFFFF';
  ctxB.fillRect(wx - wHalf - 40, wyBot - 4, (wHalf + 40) * 2, 28);

  // Deep leaded glass interior
  drawWindowPath(ctxC, -2);
  const glassGrad = ctxC.createLinearGradient(wx, wyTop, wx, wyBot);
  glassGrad.addColorStop(0, '#3B5978');
  glassGrad.addColorStop(0.5, '#253952');
  glassGrad.addColorStop(1, '#1A2738');
  ctxC.fillStyle = glassGrad;
  ctxC.fill();

  drawWindowPath(ctxB, -2);
  ctxB.fillStyle = '#181818'; // Deeply recessed glass
  ctxB.fill();

  drawWindowPath(ctxR, -2);
  ctxR.fillStyle = '#2A2A2A'; // Glossy glass
  ctxR.fill();

  // Stone mullion & diamond leaded glass lattice
  ctxC.strokeStyle = '#9E9586';
  ctxC.lineWidth = 10;
  ctxC.beginPath();
  ctxC.moveTo(wx, wyTop + 40);
  ctxC.lineTo(wx, wyBot);
  ctxC.stroke();

  ctxC.strokeStyle = 'rgba(15, 20, 28, 0.75)';
  ctxC.lineWidth = 2;
  for (let d = -260; d <= 360; d += 26) {
    ctxC.beginPath();
    ctxC.moveTo(wx - wHalf, wyTop + d);
    ctxC.lineTo(wx + wHalf, wyTop + d + 120);
    ctxC.moveTo(wx + wHalf, wyTop + d);
    ctxC.lineTo(wx - wHalf, wyTop + d + 120);
    ctxC.stroke();
  }

  // Subtle recessed niche shadow around central Heraldic Shield area (lower center y = 680)
  const shieldHalo = ctxC.createRadialGradient(wx, 680, 40, wx, 680, 170);
  shieldHalo.addColorStop(0, 'rgba(20, 14, 10, 0.45)');
  shieldHalo.addColorStop(1, 'rgba(20, 14, 10, 0)');
  ctxC.fillStyle = shieldHalo;
  ctxC.fillRect(wx - 180, 500, 360, 360);

  // 5. Heraldic Shield Texture (Golden Upper Silesian Eagle on Azure Blue Field)
  const cShield = document.createElement('canvas');
  cShield.width = 512;
  cShield.height = 512;
  const ctxS = cShield.getContext('2d')!;

  const azGrad = ctxS.createLinearGradient(0, 0, 0, 512);
  azGrad.addColorStop(0, '#1D4ED8');
  azGrad.addColorStop(0.6, '#1E3A8A');
  azGrad.addColorStop(1, '#172554');
  ctxS.fillStyle = azGrad;
  ctxS.fillRect(0, 0, 512, 512);

  // Gold border inner line
  ctxS.strokeStyle = '#FACC15';
  ctxS.lineWidth = 16;
  ctxS.strokeRect(18, 18, 476, 476);

  // Golden Upper Silesian Piast Eagle silhouette
  ctxS.fillStyle = '#FACC15';
  ctxS.strokeStyle = '#92400E';
  ctxS.lineWidth = 5;
  ctxS.beginPath();
  // Head & Crown
  ctxS.moveTo(256, 78);
  ctxS.lineTo(276, 98);
  ctxS.lineTo(268, 128);
  // Right Wing
  ctxS.lineTo(395, 118);
  ctxS.lineTo(426, 158);
  ctxS.lineTo(366, 178);
  ctxS.lineTo(405, 206);
  ctxS.lineTo(342, 224);
  ctxS.lineTo(372, 255);
  ctxS.lineTo(306, 265);
  // Right Talon & Tail
  ctxS.lineTo(334, 342);
  ctxS.lineTo(290, 336);
  ctxS.lineTo(278, 422);
  ctxS.lineTo(256, 396);
  ctxS.lineTo(234, 422);
  // Left Talon
  ctxS.lineTo(222, 336);
  ctxS.lineTo(178, 342);
  ctxS.lineTo(206, 265);
  // Left Wing
  ctxS.lineTo(140, 255);
  ctxS.lineTo(170, 224);
  ctxS.lineTo(107, 206);
  ctxS.lineTo(146, 178);
  ctxS.lineTo(86, 158);
  ctxS.lineTo(117, 118);
  ctxS.lineTo(244, 128);
  ctxS.lineTo(236, 98);
  ctxS.closePath();
  ctxS.fill();
  ctxS.stroke();

  const map = configureColorTexture(cColor, anisotropy, 1, 1);
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = configureDataTexture(cBump, anisotropy, 1, 1);
  bumpMap.wrapS = THREE.ClampToEdgeWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = configureDataTexture(cRough, anisotropy, 1, 1);
  roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  const shieldMap = configureColorTexture(cShield, anisotropy, 1, 1);
  shieldMap.wrapS = THREE.ClampToEdgeWrapping;
  shieldMap.wrapT = THREE.ClampToEdgeWrapping;

  return { map, bumpMap, roughnessMap, shieldMap };
}

export function createStoneTexture(anisotropy: number, repeatX = 2, repeatY = 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9E9689';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 10;
  const cols = 6;
  const rh = 256 / rows;
  const cw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const v = 188 + Math.round(Math.sin(r * 11.1 + c * 5.9) * 18);
      ctx.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      ctx.fillRect(c * cw + offset + 1.5, r * rh + 1.5, cw - 3, rh - 3);
    }
  }

  return configureColorTexture(canvas, anisotropy, repeatX, repeatY);
}

export function createWoodTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6B4628';
  ctx.fillRect(0, 0, 128, 256);

  for (let x = 0; x < 128; x += 6) {
    const shade = 0.85 + Math.sin(x * 0.7) * 0.15;
    ctx.fillStyle = `rgb(${Math.round(115 * shade)}, ${Math.round(74 * shade)}, ${Math.round(42 * shade)})`;
    ctx.fillRect(x, 0, 4, 256);
  }
  return configureColorTexture(canvas, anisotropy, 1, 1);
}

export function createRoofTileTexture(anisotropy: number, colorHex = '#8D3326'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 256);

  const rows = 16;
  const rh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = r % 2 === 0 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, r * rh, 256, 3);
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + (r % 2) * 8, r * rh, 2, rh);
    }
  }
  return configureColorTexture(canvas, anisotropy, 3, 3);
}

export function createPiastBannerTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(0, 64, 256, 64);

  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);

  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(72, 64, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1E3A8A';
  ctx.beginPath();
  ctx.moveTo(72, 42);
  ctx.lineTo(90, 58);
  ctx.lineTo(82, 82);
  ctx.lineTo(72, 74);
  ctx.lineTo(62, 82);
  ctx.lineTo(54, 58);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Centered bronze museum plaque with generous side margins
 */
export function createPlaqueTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 1024, 256);
  grad.addColorStop(0, '#2B2118');
  grad.addColorStop(0.5, '#1D150F');
  grad.addColorStop(1, '#2B2118');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Outer & inner brass frames
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 988, 220);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, 956, 188);

  // Corner brass rivets
  const rivets = [
    [52, 52],
    [972, 52],
    [52, 204],
    [972, 204],
  ];
  ctx.fillStyle = '#D4AF37';
  rivets.forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Main title & subtitle centered inside safe 840px width
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#F5DF9A';
  ctx.font = 'bold 74px Georgia, "Times New Roman", serif';
  ctx.fillText('ZAMEK • RACIBÓRZ', 512, 104, 840);

  ctx.fillStyle = '#D4C090';
  ctx.font = '600 30px sans-serif';
  ctx.fillText('CYFROWA REKONSTRUKCJA • rz. ODRA', 512, 174, 840);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.65)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
