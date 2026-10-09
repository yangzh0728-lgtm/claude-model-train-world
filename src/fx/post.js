// 后期：辉光 → 合成（色差、闪白、暗角、胶片颗粒、终端文字、淡入淡出）
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const Composite = {
  uniforms: {
    tDiffuse: { value: null },
    tText: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1.5 },
    uFlash: { value: 0 },
    uRGB: { value: 0 },
    uGrain: { value: 0.035 },
    uFrame: { value: 0 },
    uFade: { value: 1 },
    uVignette: { value: 0.35 },
    uPaper: { value: 0 },
    uPaperCol: { value: new THREE.Color(0.93, 0.915, 0.87) },
    uInk: { value: 2.2 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tText;
    uniform vec2 uRes;
    uniform float uExposure, uFlash, uRGB, uGrain, uFrame, uFade, uVignette, uPaper, uInk;
    uniform vec3 uPaperCol;
    varying vec2 vUv;
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 uv=vUv;
      vec3 c;
      if(uRGB>0.0){
        vec2 o=vec2(uRGB,0.0);
        c=vec3(texture2D(tDiffuse,uv+o).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-o).b);
      } else c=texture2D(tDiffuse,uv).rgb;
      vec2 q=uv-0.5; q.x*=uRes.x/uRes.y;
      vec3 glow=(1.0-exp(-c*uExposure))*(1.0-uVignette*dot(q,q)*1.2);
      if(uPaper>0.0){
        // 纸面：粒子亮度换成墨色深浅；彩色粒子保留色相，灰白粒子变成近黑的墨
        float ink=1.0-exp(-dot(c,vec3(0.3,0.5,0.2))*uInk);
        float mx=max(max(c.r,c.g),c.b)+1e-5, mn=min(min(c.r,c.g),c.b);
        float sat=(mx-mn)/mx;
        vec3 inkCol=mix(vec3(0.13,0.13,0.14),(c/mx)*0.62,smoothstep(0.25,0.7,sat));
        vec3 paper=uPaperCol*(1.0-0.08*dot(q,q));
        c=mix(glow,mix(paper,inkCol,ink),uPaper);
      } else c=glow;
      vec4 tx=texture2D(tText,uv);
      c=mix(c,tx.rgb,tx.a);
      c=mix(c,vec3(1.0),clamp(uFlash,0.0,1.0));
      c+=(hash(uv*uRes+uFrame*17.0)-0.5)*uGrain;
      gl_FragColor=vec4(clamp(c*uFade,0.0,1.0),1.0);
    }
  `,
};

export function createPost(renderer, scene, camera, textCanvas) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.4, 0.05);
  composer.addPass(bloom);
  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.minFilter = THREE.LinearFilter;
  textTex.generateMipmaps = false;
  const comp = new ShaderPass(Composite);
  comp.uniforms.tText.value = textTex;
  composer.addPass(comp);

  return {
    composer, bloom, comp, textTex,
    setSize(w, h) {
      composer.setPixelRatio(1);
      composer.setSize(w, h);
      comp.uniforms.uRes.value.set(w, h);
    },
    render(fx, frame) {
      const u = comp.uniforms;
      u.uFlash.value = fx.flash ?? 0;
      u.uRGB.value = fx.rgb ?? 0;
      u.uFade.value = fx.fade ?? 1;
      u.uExposure.value = fx.exposure ?? 1.3;
      u.uFrame.value = frame % 997;
      u.uPaper.value = fx.paper ?? 0;
      u.uGrain.value = fx.paper ? 0.02 : 0.035;
      bloom.strength = fx.paper ? 0 : fx.bloom ?? 0.7;
      textTex.needsUpdate = true;
      composer.render();
    },
  };
}
