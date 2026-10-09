// 入口。两种模式：
//   实时预览（默认）：音频播放时间是主时钟，带调试面板
//   离线导出（?export）：按固定帧率逐帧推进时钟，把每帧像素发给本地渲染服务，由 ffmpeg 编码
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import * as THREE from 'three';
import tl from './timeline.json';
import { createClock } from './clock.js';
import { Swarm } from './particles/swarm.js';
import { initShapes } from './shapes/index.js';
import { Terminal } from './text/terminal.js';
import { createPost } from './fx/post.js';
import { createDirector } from './director.js';
import { collectLog } from './ch/index.js';
import { createDebug } from './debug/panel.js';
import { runExport } from './export/exporter.js';

const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
const side = Number(params.get('n') ?? 512);   // 512 → 262,144 个粒子
const N = side * side;

await Promise.all([
  document.fonts.load('500 32px "JetBrains Mono"'),
  document.fonts.load('700 32px "JetBrains Mono"'),
]);

const clock = createClock(tl);
initShapes(N);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: EXPORT, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
const swarm = new Swarm(N);
scene.add(swarm.points);
const terminal = new Terminal(clock, tl, collectLog(clock));
const post = createPost(renderer, scene, camera, terminal.canvas);
const director = createDirector({ clock, swarm, camera, terminal });

const size = { width: 0, height: 0 };
function setSize(w, h) {
  size.width = w; size.height = h;
  renderer.setSize(w, h, false);
  post.setSize(w, h);
  terminal.resize(w, h);
}

let frameNo = 0;
function draw(t) {
  const { info, fx } = director.frame(t, size);
  post.render(fx, frameNo++);
  return info;
}

if (EXPORT) {
  document.body.classList.add('export');
  const w = Number(params.get('w') ?? 3840), h = Number(params.get('h') ?? 2160);
  setSize(w, h);
  runExport({ renderer, draw, params, size, clock });
} else {
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    setSize(Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr));
  };
  fit();
  window.addEventListener('resize', fit);
  const audio = new Audio(tl.audio);
  audio.preload = 'auto';
  const debug = createDebug({ audio, clock, tl });
  const loop = () => {
    const info = draw(debug.time());
    debug.show(info);
    requestAnimationFrame(loop);
  };
  loop();
}
