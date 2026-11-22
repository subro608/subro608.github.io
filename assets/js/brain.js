// Interactive Allen CCF brain with Neuropixels tracks: Allen Brain Observatory probes and IBL ground-truth (histology) probes.
// Loaded only on the home page, only once the figure scrolls into view. Drag to rotate, scroll/pinch to zoom.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const host = document.getElementById('brain');
const MID = 5700, base = 'assets/brain/';
const toV = (ap, dv, ml) => [(ml - MID) / 1000, -(dv - 4000) / 1000, (ap - 6600) / 1000];
const css = n => getComputedStyle(host).getPropertyValue(n).trim();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function init() {
  const [P, mesh] = await Promise.all([fetch(base + 'probes.json').then(r => r.json()), fetch(base + 'brain_mesh.json').then(r => r.json()).then(j => Uint8Array.from(atob(j.b64), c => c.charCodeAt(0)).buffer)]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
  camera.position.set(-17.5, 8.5, -17.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, autoRotate: true, autoRotateSpeed: reduce ? .4 : .7, enablePan: false, minDistance: 9, maxDistance: 40 });
  controls.target.set(0, -.6, .3);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dde8, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, .9); dl.position.set(-6, 10, -8); scene.add(dl);

  // brain surface (uint16 vertices in um, uint16 faces)
  const { nv, nf } = P.mesh, vq = new Uint16Array(mesh, 0, nv * 3), fq = new Uint16Array(mesh, nv * 6, nf * 3);
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) pos.set(toV(vq[3 * i], vq[3 * i + 1], vq[3 * i + 2]), 3 * i);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(fq), 1)); g.computeVertexNormals();
  const brainMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide, shininess: 10 });
  scene.add(new THREE.Mesh(g, brainMat));

  // probe tracks: one LineSegments2 per set
  const sets = [];
  for (const [key, width] of [['allen', 1.6], ['ibl', 2.4]]) {
    const seg = [];
    for (const t of P[key]) for (let k = 0; k + 5 < t.length; k += 3) seg.push(...toV(t[k], t[k + 1], t[k + 2]), ...toV(t[k + 3], t[k + 4], t[k + 5]));
    const geo = new LineSegmentsGeometry(); geo.setPositions(seg);
    const mat = new LineMaterial({ linewidth: width, transparent: true, opacity: .92, depthWrite: false });
    const lines = new LineSegments2(geo, mat); lines.renderOrder = 2; scene.add(lines); sets.push([key, mat, lines]);
  }
  const theme = () => {
    brainMat.color.set(css('--brain-surface') || '#9aa3b5');
    for (const [key, mat] of sets) mat.color.set(css(key === 'allen' ? '--probe-allen' : '--probe-ibl'));
  };
  theme(); new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);

  // legend toggles
  host.parentElement.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const s = sets.find(x => x[0] === b.dataset.set); s[2].visible = !s[2].visible; b.setAttribute('aria-pressed', String(s[2].visible));
  }));
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  const size = () => {
    const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    // in the wide hero, push the brain to the right of the welcome text
    const shift = host.dataset.shift ? +host.dataset.shift : 0;
    if (shift && w > 900) camera.setViewOffset(w, h, -w * shift, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    for (const [, mat] of sets) mat.resolution.set(w, h);
  };
  new ResizeObserver(size).observe(host); size();
  let visible = true; new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(host);
  const face = host.closest('.face'), wheel = host.closest('.wheel');
  const shown = () => visible && (!face || face.classList.contains('on') || wheel.classList.contains('moving'));
  renderer.setAnimationLoop(() => { if (!shown()) return; controls.update(); renderer.render(scene, camera); });
  host.classList.add('ready');
}

new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { o.disconnect(); init().catch(err => { console.warn(err); host.classList.add('failed'); }); } },
  { rootMargin: '200px' }).observe(host);
