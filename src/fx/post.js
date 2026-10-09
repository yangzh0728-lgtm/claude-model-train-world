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
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tText;
    uniform vec2 uRes;
    uniform float uExposure, uFlash, uRGB, uGrain, uFrame, uFade, uVignette;
    varying vec2 vUv;
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 uv=vUv;
      vec3 c;
      if(uRGB>0.0){
        vec2 o=vec2(uRGB,0.0);
        c=vec3(texture2D(tDiffuse,uv+o).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-o).b);
      } else c=texture2D(tDiffuse,uv).rgb;
      c=1.0-exp(-c*uExposure);
      vec2 q=uv-0.5; q.x*=uRes.x/uRes.y;
      c*=1.0-uVignette*dot(q,q)*1.2;
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
      bloom.strength = fx.bloom ?? 0.7;
      textTex.needsUpdate = true;
      composer.render();
    },
  };
}
