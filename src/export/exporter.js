// 离线导出（页面一侧）：按固定帧率逐帧推进时钟，读回像素，POST 给渲染服务。
// 渲染服务（scripts/render.mjs）把原始 RGBA 帧直接喂给 ffmpeg，不落地 PNG。
export async function runExport({ renderer, draw, params, size, clock }) {
  const fps = Number(params.get('fps') ?? 60);
  const from = Number(params.get('from') ?? 0);
  const to = Math.min(Number(params.get('to') ?? clock.duration), clock.duration);
  const first = Math.round(from * fps), last = Math.round(to * fps);
  const gl = renderer.getContext();
  const { width: w, height: h } = size;
  const bufs = [new Uint8Array(w * h * 4), new Uint8Array(w * h * 4)];
  let pending = null;
  const t0 = performance.now();

  for (let i = first; i < last; i++) {
    draw(i / fps);
    renderer.setRenderTarget(null);
    const buf = bufs[i & 1];
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    if (pending) await pending;
    pending = fetch(`/__frame?i=${i}`, { method: 'POST', body: buf }).then((r) => {
      if (!r.ok) throw new Error(`frame ${i}: ${r.status}`);
    });
    if ((i - first) % 30 === 0) {
      const done = i - first + 1, el = (performance.now() - t0) / 1000;
      console.log(`[export] ${done}/${last - first} 帧  ${(done / el).toFixed(2)} fps`);
    }
  }
  if (pending) await pending;
  await fetch('/__done', { method: 'POST' });
}
