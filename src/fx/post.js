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
    uGlitch: { value: 0 },
    uPaperTo: { value: 0 },
    uTrans: { value: 0 },
    uTransType: { value: 0 },
    uTextPaper: { value: 0 },
    uTextInk: { value: new THREE.Color(1, 1, 1) },
    uGlitchSeed: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tText;
    uniform vec2 uRes;
    uniform float uExposure, uFlash, uRGB, uGrain, uFrame, uFade, uVignette, uPaper, uInk, uGlitch, uGlitchSeed;
    uniform float uPaperTo, uTrans, uTransType, uTextPaper;
    uniform vec3 uPaperCol, uTextInk;
    varying vec2 vUv;
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0,a=0.5; for(int k=0;k<5;k++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
    // 风格转场遮罩：m = 1 的地方已经是新风格；edge 是边缘的发光强度，ec 是边缘颜色
    float transMask(vec2 uv, out float edge, out vec3 ec){
      edge=0.0; ec=vec3(0.0);
      if(uTransType<0.5) return 0.0;
      float asp=uRes.x/uRes.y;
      vec2 p=vec2(uv.x*asp,uv.y);
      float n=fbm(p*3.0+7.3);
      float q=uTrans;
      if(uTransType<1.5){
        // 墨水晕开：从画面中心一圈圈洇出纸面，边缘不规则
        float d=length((uv-0.5)*vec2(asp,1.0))+(n-0.5)*0.35;
        float r=q*1.35-0.05;
        edge=exp(-abs(d-r)*110.0)*0.45;
        ec=vec3(1.0,0.86,0.6);
        return smoothstep(r+0.012,r-0.012,d);
      } else if(uTransType<2.5){
        // 纸烧掉：噪声溶解，带一圈火星
        float v=n*0.85+(1.0-uv.y)*0.15+fbm(p*14.0)*0.08;
        float th=q*1.15-0.05;
        edge=exp(-abs(v-th)*45.0)*step(v,th+0.06);
        ec=vec3(1.0,0.45,0.08);
        return smoothstep(th+0.008,th-0.008,v);
      } else if(uTransType<3.5){
        // 图纸被扫描出来：一条亮线从上往下扫，线后面是图纸
        float y=1.0-uv.y+(vnoise(vec2(uv.x*40.0,q*9.0))-0.5)*0.01;
        float th=q*1.1-0.05;
        edge=exp(-abs(y-th)*140.0)+0.25*exp(-abs(y-th)*18.0);
        ec=vec3(0.45,0.85,1.0);
        return step(y,th);
      } else {
        // 图纸退场：扫描线从下往上收回
        float y=uv.y+(vnoise(vec2(uv.x*40.0,q*9.0))-0.5)*0.01;
        float th=q*1.1-0.05;
        edge=exp(-abs(y-th)*140.0)+0.25*exp(-abs(y-th)*18.0);
        ec=vec3(0.45,0.85,1.0);
        return step(y,th);
      }
    }
    void main(){
      vec2 uv=vUv;
      vec3 c;
      float rgb=uRGB;
      if(uGlitch>0.0){
        // 故障：横向条带错位、块状位移、局部反色
        float band=floor(uv.y*mix(8.0,40.0,hash(vec2(uGlitchSeed,1.0))));
        float hb=hash(vec2(band,uGlitchSeed));
        if(hb<uGlitch*0.55) uv.x+=(hash(vec2(band,uGlitchSeed+7.0))-0.5)*0.25*uGlitch;
        vec2 blk=floor(uv*vec2(12.0,7.0));
        float hk=hash(blk+uGlitchSeed*3.1);
        if(hk<uGlitch*0.12) uv+=(vec2(hash(blk+5.0+uGlitchSeed),hash(blk+9.0+uGlitchSeed))-0.5)*0.15;
        rgb+=uGlitch*0.012*hash(vec2(band,uGlitchSeed+3.0));
      }
      if(rgb>0.0){
        vec2 o=vec2(rgb,0.0);
        c=vec3(texture2D(tDiffuse,uv+o).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-o).b);
      } else c=texture2D(tDiffuse,uv).rgb;
      vec2 q=uv-0.5; q.x*=uRes.x/uRes.y;
      vec3 glow=(1.0-exp(-c*uExposure))*(1.0-uVignette*dot(q,q)*1.2);
      float edge; vec3 ec;
      float tm=transMask(uv,edge,ec);
      float paperAmt=uTransType>0.5?mix(uPaper,uPaperTo,tm):uPaper;
      if(paperAmt>0.0){
        // 纸面：粒子亮度换成墨色深浅；彩色粒子保留色相，灰白粒子变成近黑的墨
        float ink=1.0-exp(-dot(c,vec3(0.3,0.5,0.2))*uInk);
        float mx=max(max(c.r,c.g),c.b)+1e-5, mn=min(min(c.r,c.g),c.b);
        float sat=(mx-mn)/mx;
        vec3 inkCol=mix(vec3(0.13,0.13,0.14),(c/mx)*0.62,smoothstep(0.25,0.7,sat));
        vec3 paper=uPaperCol*(1.0-0.08*dot(q,q));
        c=mix(glow,mix(paper,inkCol,ink),paperAmt);
      } else c=glow;
      vec4 tx=texture2D(tText,uv);
      // 文字颜色跟着像素所在的风格走：纸上是墨色，暗场里是章节色
      vec3 tcol=tx.rgb;
      if(uTransType>0.5){
        vec3 darkCol=uTextPaper>0.5?uTextInk:tx.rgb, inkCol2=uTextPaper>0.5?tx.rgb:vec3(0.13,0.13,0.14);
        tcol=mix(darkCol,inkCol2,paperAmt);
      }
      c=mix(c,tcol,tx.a);
      c+=ec*edge*0.9;
      if(uGlitch>0.0){
        c*=1.0-uGlitch*0.25*step(0.5,fract(uv.y*uRes.y*0.25));
      }
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
      u.uPaperTo.value = fx.paperTo ?? fx.paper ?? 0;
      u.uTrans.value = fx.trans ?? 0;
      u.uTransType.value = fx.transType ?? 0;
      u.uTextPaper.value = fx.textPaper ?? 0;
      if (fx.textInk) u.uTextInk.value.setRGB(...fx.textInk);
      u.uGlitch.value = fx.glitch ?? 0;
      u.uGlitchSeed.value = fx.glitchSeed ?? 0;
      const pg = (fx.paper ?? 0) + ((fx.paperTo ?? fx.paper ?? 0) - (fx.paper ?? 0)) * (fx.transType ? fx.trans : 0);
      u.uGrain.value = 0.035 - 0.015 * pg;
      bloom.strength = (fx.bloom ?? 0.7) * (1 - pg);
      textTex.needsUpdate = true;
      composer.render();
    },
  };
}
