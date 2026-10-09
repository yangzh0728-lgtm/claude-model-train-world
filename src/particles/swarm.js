// 粒子群：N 个粒子在“形态 A”和“形态 B”之间变形。
//
// 和原作的 GPGPU 速度积分不同，这里每个粒子的位置是时间的纯函数：
// pos = mix(A, B, ease(进度)) + 噪声。没有逐帧累积的状态，
// 所以可以任意跳转、任意帧率逐帧导出，多台机器分段渲染的结果也能无缝拼接。
import * as THREE from 'three';
import noise from './noise.glsl.js';
import { rng } from '../util.js';

const vert = /* glsl */ `
${noise}
attribute vec3 aA;
attribute vec3 aB;
attribute vec3 cA;
attribute vec3 cB;
attribute vec4 aSeed;
uniform mat4 uMatA, uMatB;
uniform float uP, uStagger, uNoise, uDrift, uTime, uSize, uScale, uPulse, uTintMix, uKick, uKickSeed;
uniform int uEase;
uniform vec3 uTint;
varying vec3 vCol;
varying float vAlpha;

float ease(float x){
  if(uEase==1) return x>=1.0?1.0:1.0-pow(2.0,-10.0*x);   // 爆炸：指数缓出
  if(uEase==2) return x*x*x;                             // 塌缩：缓入
  return x*x*x*(x*(x*6.0-15.0)+10.0);                    // 默认：smootherstep
}

void main(){
  vec3 a=(uMatA*vec4(aA,1.0)).xyz;
  vec3 b=(uMatB*vec4(aB,1.0)).xyz;
  float d=aSeed.x*uStagger;
  float lp=clamp((uP-d)/max(1.0-uStagger,1e-4),0.0,1.0);
  float e=ease(lp);
  vec3 pos=mix(a,b,e);
  float bump=sin(3.14159265*lp);
  if(uNoise>0.0 && bump>0.001){
    pos+=noise3(pos*0.45+aSeed.yzw*0.6+vec3(0.0,0.0,uTime*0.2))*uNoise*bump;
  }
  // 节拍冲击：每拍粒子被“踢”散一下再收回
  if(uKick>0.0){
    pos+=noise3(pos*0.8+vec3(aSeed.x*7.0,uKickSeed,0.0))*uKick;
  }
  if(uDrift>0.0){
    pos+=noise3(pos*1.7+vec3(uTime*0.25,0.0,aSeed.y*3.0))*uDrift;
  }
  vec4 mv=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*mv;
  float ps=uSize*uScale*(0.55+0.9*aSeed.w)/max(-mv.z,0.05);
  // 小于 1.5 像素的点改为降低亮度，这样 1080p 和 4K 下画面总亮度一致
  gl_PointSize=max(ps,1.5);
  vAlpha=min(1.0,(ps*ps)/2.25);
  vCol=mix(mix(cA,cB,e),uTint,uTintMix)*(1.0+uPulse);
}
`;

const frag = /* glsl */ `
uniform float uOpacity;
varying vec3 vCol;
varying float vAlpha;
void main(){
  vec2 c=gl_PointCoord-0.5;
  float r=dot(c,c)*4.0;
  if(r>1.0) discard;
  float a=exp(-r*3.0)*vAlpha*uOpacity;
  gl_FragColor=vec4(vCol*a,1.0);
}
`;

export class Swarm {
  constructor(N) {
    this.N = N;
    const g = new THREE.BufferGeometry();
    const mk = (n) => new THREE.BufferAttribute(new Float32Array(N * n), n).setUsage(THREE.DynamicDrawUsage);
    this.attr = { aA: mk(3), aB: mk(3), cA: mk(3), cB: mk(3) };
    for (const [k, v] of Object.entries(this.attr)) g.setAttribute(k, v);
    const seed = new Float32Array(N * 4);
    const r = rng(7);
    for (let i = 0; i < N * 4; i++) seed[i] = r();
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    // position 只用于包围盒；实际位置在着色器里算
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.uniforms = {
      uMatA: { value: new THREE.Matrix4() },
      uMatB: { value: new THREE.Matrix4() },
      uP: { value: 0 }, uStagger: { value: 0 }, uNoise: { value: 0 }, uDrift: { value: 0 },
      uTime: { value: 0 }, uSize: { value: 1 }, uScale: { value: 1 }, uPulse: { value: 0 },
      uEase: { value: 0 }, uKick: { value: 0 }, uKickSeed: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uTintMix: { value: 0 },
      uOpacity: { value: 1 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.loaded = { A: null, B: null };
  }

  // 把形态拷进 A 或 B 槽；同一形态且版本没变时跳过上传
  load(slot, shape) {
    const cur = this.loaded[slot];
    if (cur && cur.shape === shape && cur.version === shape.version) return;
    const p = this.attr['a' + slot], c = this.attr['c' + slot];
    p.array.set(shape.pos); p.needsUpdate = true;
    c.array.set(shape.col); c.needsUpdate = true;
    this.loaded[slot] = { shape, version: shape.version };
  }

  // 应用一帧的粒子状态（由章节的镜头函数给出）
  apply(s, time, scale) {
    const u = this.uniforms;
    this.load('A', s.from);
    this.load('B', s.to ?? s.from);
    u.uMatA.value.copy(s.matA ?? IDENT);
    u.uMatB.value.copy(s.matB ?? (s.to ? IDENT : s.matA ?? IDENT));
    u.uP.value = s.to ? s.p ?? 0 : 0;
    u.uStagger.value = s.stagger ?? 0.15;
    u.uNoise.value = s.noise ?? 0.6;
    u.uDrift.value = s.drift ?? 0.012;
    u.uEase.value = { smooth: 0, expoOut: 1, in: 2 }[s.ease ?? 'expoOut'];
    u.uKick.value = s.kick ?? 0;
    u.uKickSeed.value = s.kickSeed ?? 0;
    u.uSize.value = s.size ?? 1;
    u.uOpacity.value = s.opacity ?? 1;
    u.uPulse.value = s.pulse ?? 0;
    u.uTintMix.value = s.tintMix ?? 0;
    if (s.tint) u.uTint.value.setRGB(...s.tint);
    u.uTime.value = time;
    u.uScale.value = scale;
  }
}

const IDENT = new THREE.Matrix4();
