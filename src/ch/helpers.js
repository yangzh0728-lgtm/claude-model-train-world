// 章节编写用的小工具：矩阵与相机
import * as THREE from 'three';
import { lerp3, lerp } from '../util.js';

export const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
export const RY = (a) => new THREE.Matrix4().makeRotationY(a);
export const RX = (a) => new THREE.Matrix4().makeRotationX(a);
export const RZ = (a) => new THREE.Matrix4().makeRotationZ(a);
export const S = (s) => new THREE.Matrix4().makeScale(s, s, s);
// mul(A, B, C) = A·B·C（先作用 C）
export const mul = (...ms) => ms.reduce((acc, m) => acc.multiply(m), new THREE.Matrix4());

export const cam = (pos, look = [0, 0, 0], fov = 40) => ({ pos, look, fov });
export const lerpCam = (a, b, t) => ({ pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t), fov: lerp(a.fov ?? 40, b.fov ?? 40, t) });
// 每小节硬切一个机位：cut(f.bar, [机位1, 机位2, …])
export const cut = (bar, list) => list[((bar % list.length) + list.length) % list.length];
// 绕 y 轴环绕：角度、半径、高度
export const orbit = (angle, radius, height, look = [0, 0, 0], fov = 40) =>
  cam([look[0] + Math.sin(angle) * radius, look[1] + height, look[2] + Math.cos(angle) * radius], look, fov);
