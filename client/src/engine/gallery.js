/* Mesin 3D (Three.js): membangun ruangan, lukisan, instalasi, dan kontrol jalan */
import * as THREE from "three";
import { EYE, RADIUS, WALL_H, PART_H, PART_T, DEG, REDUCED, FLOORS, clamp, hashStr } from "../lib/constants.js";
import { footOf, obstaclesOf, hits } from "../lib/geometry.js";
import { rng, floorCanvas, paint } from "../lib/textures.js";
import { loadModel } from "../lib/files.js";

export const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
export function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }
export function drawTex(draw, w, hh) { const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh); return canvasTex(c); }

export function instMaterial(inst) {
  let m;
  if (inst.finish === "kilap") m = new THREE.MeshPhysicalMaterial({ color: lin(inst.color), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
  else if (inst.finish === "logam") m = new THREE.MeshStandardMaterial({ color: lin(inst.color), roughness: 0.32, metalness: 0.72 });
  else m = new THREE.MeshStandardMaterial({ color: lin(inst.color), roughness: 0.85, metalness: 0 });
  return m;
}

export function buildInstall(inst, shared, anims) {
  const g = new THREE.Group(), s = inst.size, mat = instMaterial(inst), ped = shared.ped;
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); g.add(me); return me; };
  const r = rng(hashStr(inst.id));
  if (inst.kind === "monolit") {
    const sw = s * 0.42, sd = 0.3, shape = new THREE.Shape();
    shape.moveTo(-sw / 2, 0); shape.lineTo(sw / 2, 0); shape.lineTo(sw / 2, s); shape.lineTo(-sw / 2, s); shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, s * 0.62, sw * 0.28, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: sd, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 48 });
    geo.translate(0, 0, -sd / 2);
    add(new THREE.BoxGeometry(sw + 0.3, 0.08, 0.7), ped, 0, 0.04, 0);
    add(geo, mat, 0, 0.08, 0);
  } else if (inst.kind === "simpul") {
    const ph = Math.min(0.9, s * 0.45);
    add(new THREE.BoxGeometry(0.9, ph, 0.9), ped, 0, ph / 2, 0);
    const geo = new THREE.TorusKnotGeometry(0.5, 0.14, 240, 28, 2, 3);
    geo.computeBoundingBox(); const bb = geo.boundingBox, k = (s - ph - 0.05) / (bb.max.y - bb.min.y);
    geo.scale(k, k, k);
    const knot = add(geo, mat, 0, ph + 0.05 + (s - ph - 0.05) / 2, 0);
    anims.push(dt => { knot.rotation.y += dt * 0.25; });
  } else if (inst.kind === "tumpuk") {
    const n = 7, hs = s / n;
    for (let i = 0; i < n; i++) { const w = 0.9 * (1 - i * 0.07); const b = add(new THREE.BoxGeometry(w, hs * 0.96, w), mat, 0, hs * i + hs * 0.48, 0); b.rotation.y = i * 0.21; }
  } else if (inst.kind === "bola") {
    add(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 48), ped, 0, 0.06, 0);
    const big = s * 0.42; add(new THREE.SphereGeometry(big, 48, 32), mat, -0.12, 0.12 + big, 0.08);
    for (let i = 0; i < 8; i++) {
      const rad = 0.07 + r() * s * 0.2, a = r() * Math.PI * 2, d = big * 0.9 + rad + r() * 0.25;
      const x = clamp(-0.12 + Math.cos(a) * d, -1.0 + rad, 1.0 - rad), z = clamp(0.08 + Math.sin(a) * d, -1.0 + rad, 1.0 - rad);
      add(new THREE.SphereGeometry(rad, 32, 20), mat, x, 0.12 + rad, z);
    }
  } else if (inst.kind === "spiral") {
    add(new THREE.CylinderGeometry(1.05, 1.05, 0.06, 48), ped, 0, 0.03, 0);
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, hi = 0.3 + (s - 0.3) * (i / (n - 1)), x = Math.cos(a) * 0.85, z = Math.sin(a) * 0.85;
      add(new THREE.CylinderGeometry(0.035, 0.035, hi, 10), mat, x, 0.06 + hi / 2, z);
      add(new THREE.SphereGeometry(0.06, 16, 10), mat, x, 0.06 + hi, z);
    }
  } else if (inst.kind === "gantung") {
    const wireMat = shared.wire, top = WALL_H, tierH = s / 3;
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), wireMat, 0, top - 0.25, 0);
    const discMat = mat;
    const tier = (i, len) => {
      const grp = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 6), wireMat); bar.rotation.z = Math.PI / 2; bar.position.x = len * 0.2; grp.add(bar);
      const rd = 0.18 + 0.06 * (3 - i), dx = len * 0.7;
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), wireMat); w1.position.set(dx, -0.15, 0); grp.add(w1);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(rd, rd, 0.02, 40), discMat); disc.rotation.x = Math.PI / 2; disc.position.set(dx, -0.3 - rd, 0); grp.add(disc);
      if (i < 2) {
        const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, tierH, 4), wireMat); w2.position.set(-len * 0.3, -tierH / 2, 0); grp.add(w2);
        const child = tier(i + 1, len * 0.72); child.position.set(-len * 0.3, -tierH, 0); grp.add(child);
      } else {
        const d2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 40), discMat); d2.rotation.x = Math.PI / 2; d2.position.set(-len * 0.3, -0.3, 0); grp.add(d2);
      }
      const sp = (0.12 + 0.07 * i) * (i % 2 ? -1 : 1); grp.rotation.y = r() * 6;
      anims.push(dt => { grp.rotation.y += dt * sp; });
      return grp;
    };
    const t0 = tier(0, 1.6); t0.position.y = top - 0.5; g.add(t0);
  } else if (inst.kind === "glb" && inst.model) {
    loadModel(inst.model).then(gltf => {
      if (shared.disposed()) return;
      const m = gltf.scene, box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const k = s / (sz.y || 1);
      m.scale.setScalar(k); m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
      g.add(m);
    }).catch(() => {});
  }
  // bayangan kontak & sorotan lantai
  const f = footOf(inst), ext = Math.max(f.hx, f.hz);
  if (!f.hang) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(ext * 2 + 0.9, ext * 2 + 0.9), shared.shadow); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.006; g.add(sh); }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(ext * 2 + 2.4, ext * 2 + 2.4), shared.floorPool); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.003; g.add(pool);
  g.position.set(inst.x, 0, inst.z); g.rotation.y = -inst.rot * DEG;
  return g;
}

export function createGallery(canvas, cfg, exhibits, input, cb) {
  const W = cfg.w, D = cfg.d, HW = W / 2, HD = D / 2;
  const obstacles = obstaclesOf(cfg).filter(o => !o.hang);
  let disposed = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a1815");
  scene.fog = new THREE.Fog("#1a1815", Math.max(W, D) * 0.6, Math.max(W, D) * 1.4);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 200);
  camera.rotation.order = "YXZ";
  const player = { x: cfg.spawn.x, z: cfg.spawn.z, yaw: cfg.spawn.yaw, pitch: 0 };

  scene.add(new THREE.HemisphereLight("#fff6e8", "#4a3f33", 0.7));
  const sun = new THREE.DirectionalLight("#fff1dc", 0.45); sun.position.set(4, 10, 6); scene.add(sun);

  // lantai
  const fdef = FLOORS.find(f => f.id === cfg.floor) || FLOORS[0];
  const floorTex = canvasTex(floorCanvas(fdef.id, 1024));
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(W / fdef.rep, D / fdef.rep);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: fdef.rough, metalness: 0.04 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  // dinding
  const wallCol = lin(cfg.wallColor);
  const wallMat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.95 });
  const ceilCol = wallCol.clone().lerp(lin("#e6e1d8"), 0.65);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: ceilCol, roughness: 1, emissive: ceilCol.clone().multiplyScalar(0.45) }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = WALL_H; scene.add(ceil);
  const wall = (w, x, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallMat); m.position.set(x, WALL_H / 2, z); m.rotation.y = rot; scene.add(m); };
  wall(D, -HW, 0, Math.PI / 2); wall(D, HW, 0, -Math.PI / 2); wall(W, 0, -HD, 0); wall(W, 0, HD, Math.PI);
  const baseMat = new THREE.MeshStandardMaterial({ color: wallCol.clone().multiplyScalar(0.18), roughness: 0.7 });
  [[W, 0, -HD + 0.02, 0], [W, 0, HD - 0.02, 0], [D, -HW + 0.02, 0, Math.PI / 2], [D, HW - 0.02, 0, Math.PI / 2]].forEach(([w, x, z, r]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.04), baseMat); b.position.set(x, 0.06, z); b.rotation.y = r; scene.add(b);
  });

  // sekat & bangku
  const benchMat = new THREE.MeshStandardMaterial({ color: "#5b3a24", roughness: 0.6 });
  const legMat = new THREE.MeshStandardMaterial({ color: "#1d1b19", roughness: 0.4, metalness: 0.6 });
  cfg.parts.forEach(p => {
    if (p.type === "wall") {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.len, PART_H, PART_T), wallMat);
      m.position.set(p.x, PART_H / 2, p.z); m.rotation.y = -p.rot * DEG; scene.add(m);
    } else {
      const grp = new THREE.Group(); grp.position.set(p.x, 0, p.z); grp.rotation.y = -p.rot * DEG;
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.8), benchMat); top.position.y = 0.45; grp.add(top);
      [-1.4, 1.4].forEach(x => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.41, 0.7), legMat); l.position.set(x, 0.205, 0); grp.add(l); });
      scene.add(grp);
    }
  });

  const stripMat = new THREE.MeshBasicMaterial({ color: "#fffaf0" });
  [-W / 4, W / 4].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, Math.max(2, D - 4)), stripMat); s.position.set(x, WALL_H - 0.03, 0); scene.add(s); });

  // lukisan
  const poolTex = drawTex((g, w, hh) => {
    const grd = g.createRadialGradient(w / 2, hh * 0.32, 10, w / 2, hh * 0.5, w * 0.5);
    grd.addColorStop(0, "rgba(255,236,200,0.55)"); grd.addColorStop(0.55, "rgba(255,230,190,0.18)"); grd.addColorStop(1, "rgba(255,230,190,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, hh);
  }, 256, 256);
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const frameMat = new THREE.MeshStandardMaterial({ color: "#231d17", roughness: 0.45, metalness: 0.2 });
  const plaqueMat = new THREE.MeshStandardMaterial({ color: "#f3eee4", roughness: 0.8 });
  const lampMat = new THREE.MeshStandardMaterial({ color: "#1d1b19", roughness: 0.3, metalness: 0.8 });
  const loader = new THREE.TextureLoader();
  exhibits.filter(e => e.type === "art").forEach(({ item: a, pos: p }) => {
    const grp = new THREE.Group(); grp.position.set(p.x, p.y, p.z); grp.rotation.y = p.rot;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(a.w * 2.4, a.h * 2.6), poolMat); pool.position.set(0, 0.25, -0.03); grp.add(pool);
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(a.w + 0.12, a.h + 0.12, 0.06), frameMat));
    // Bila gambar gagal dimuat (mis. file terhapus), tampilkan pola generatif sebagai gantinya
    const fallback = () => {
      const fb = new THREE.CanvasTexture(paint(a, 512));
      fb.encoding = THREE.sRGBEncoding;
      pic.material.map = fb;
      pic.material.needsUpdate = true;
    };
    const tex = a.img ? loader.load(a.img, undefined, undefined, fallback) : new THREE.CanvasTexture(paint(a, 1024));
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    pic.position.z = 0.032; grp.add(pic);
    const plq = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.01), plaqueMat); plq.position.set(a.w / 2 + 0.3, -a.h / 2 + 0.1, 0); grp.add(plq);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5), lampMat); arm.rotation.x = Math.PI / 2; arm.position.set(0, a.h / 2 + 0.55, 0.25); grp.add(arm);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.16, 16), lampMat); head.rotation.x = -0.9; head.position.set(0, a.h / 2 + 0.52, 0.52); grp.add(head);
    scene.add(grp);
  });

  // instalasi
  const fill = new THREE.DirectionalLight("#dfe6ff", 0.3); fill.position.set(-6, 7, -8); scene.add(fill);
  const anims = [];
  const shared = {
    disposed: () => disposed,
    ped: new THREE.MeshStandardMaterial({ color: lin("#efebe4"), roughness: 0.9 }),
    wire: new THREE.MeshStandardMaterial({ color: "#151413", roughness: 0.5, metalness: 0.6 }),
    shadow: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: drawTex((g, w, hh) => {
      const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.5, "rgba(0,0,0,.25)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, 128, 128) }),
    floorPool: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: drawTex((g, w, hh) => {
      const gr = g.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2); gr.addColorStop(0, "rgba(255,232,195,.32)"); gr.addColorStop(1, "rgba(255,232,195,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, hh); }, 128, 128) }),
  };
  exhibits.filter(e => e.type === "inst").forEach(e => scene.add(buildInstall(e.item, shared, anims)));

  /* input */
  const keys = {};
  const kd = e => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; keys[e.code] = true; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); };
  const ku = e => { keys[e.code] = false; };
  const clear = () => { for (const k in keys) keys[k] = false; };
  window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("blur", clear);
  const SENS = 0.0022;
  const look = (dx, dy) => { player.yaw -= dx * SENS; player.pitch = clamp(player.pitch - dy * SENS, -1.2, 1.2); };
  const onLockMove = e => { if (document.pointerLockElement === canvas) look(e.movementX, e.movementY); };
  document.addEventListener("mousemove", onLockMove);
  let drag = null;
  const pd = e => { if (document.pointerLockElement === canvas) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} };
  const pm = e => { if (!drag || drag.id !== e.pointerId) return; look((e.clientX - drag.x) * 1.4, (e.clientY - drag.y) * 1.4); drag.x = e.clientX; drag.y = e.clientY; };
  const pu = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener("pointerdown", pd); canvas.addEventListener("pointermove", pm);
  canvas.addEventListener("pointerup", pu); canvas.addEventListener("pointercancel", pu);
  const onLockChange = () => cb.onLock(document.pointerLockElement === canvas);
  document.addEventListener("pointerlockchange", onLockChange);

  const blocked = (x, z) => x < -HW + RADIUS || x > HW - RADIUS || z < -HD + RADIUS || z > HD - RADIUS || obstacles.some(o => hits(o, x, z, RADIUS));

  function resize() { const w = canvas.clientWidth, hh = canvas.clientHeight; if (!w || !hh) return; renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let last = performance.now(), raf = 0, bob = 0, nearId = -1;
  const dir = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const f = (keys.KeyW || keys.ArrowUp || input.up ? 1 : 0) - (keys.KeyS || keys.ArrowDown || input.down ? 1 : 0);
    const s = (keys.KeyD || input.right ? 1 : 0) - (keys.KeyA || input.left ? 1 : 0);
    player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 1.8 * dt;
    const v = keys.ShiftLeft || keys.ShiftRight ? 5.2 : 2.8, speed = v * dt;
    let mx = 0, mz = 0;
    if (f || s) {
      const len = Math.hypot(f, s), sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
      mx = (-sy * f + cy * s) / len * speed; mz = (-cy * f - sy * s) / len * speed;
      bob += dt * v * 2.4;
    }
    const stuck = blocked(player.x, player.z);
    if (stuck || !blocked(player.x + mx, player.z)) player.x += mx;
    if (stuck || !blocked(player.x, player.z + mz)) player.z += mz;
    player.x = clamp(player.x, -HW + RADIUS, HW - RADIUS); player.z = clamp(player.z, -HD + RADIUS, HD - RADIUS);
    if (!REDUCED) anims.forEach(fn => fn(dt));

    camera.position.set(player.x, EYE + Math.sin(bob) * 0.025, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);

    camera.getWorldDirection(dir);
    let best = -1, bestD = Infinity;
    exhibits.forEach((e, i) => {
      const dx = e.x - player.x, dz = e.z - player.z, d = Math.hypot(dx, dz);
      if (d > 0.01 && d < 4.2 + e.reach && d - e.reach < bestD && (dx * dir.x + dz * dir.z) / d > 0.55) { best = i; bestD = d - e.reach; }
    });
    if (best !== nearId) { nearId = best; cb.onNear(best); }
    cb.onFrame(player);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    lock() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} },
    unlock() { try { if (document.pointerLockElement === canvas) document.exitPointerLock(); } catch (_) {} },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", clear);
      document.removeEventListener("mousemove", onLockMove); document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("pointerdown", pd); canvas.removeEventListener("pointermove", pm);
      canvas.removeEventListener("pointerup", pu); canvas.removeEventListener("pointercancel", pu);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
    },
  };
}
