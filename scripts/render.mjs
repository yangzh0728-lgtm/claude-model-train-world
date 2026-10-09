// 离线渲染：用浏览器逐帧渲染，原始像素直接管道给 ffmpeg 编码，最后配上音频。
//
//   npm run render -- --from 0 --to 10                      # 渲染 0–10 秒，4K60
//   npm run render -- --from 0 --to 50 --w 1920 --h 1080    # 1080p 预览
//   npm run render -- --full                                # 全片：按章节分段渲染（可中断续跑），再拼接配音
//
// 常用参数：
//   --w 3840 --h 2160 --fps 60   分辨率和帧率（默认 4K60）
//   --n 512                      粒子边长，512 → 26 万粒子
//   --codec h264|h265|prores     h264：上传平台用（默认）；prores：后期调色用的母版 .mov
//   --crf 16                     h264/h265 质量，越小越好
//   --out out/xxx.mp4            输出路径
//   --browser <路径>             指定 Chrome/Chromium 可执行文件；默认用本机安装的 Google Chrome
//   --headed                     有窗口模式（个别系统无头模式不走 GPU 时使用）
//   --no-audio                   不配音
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, createReadStream, renameSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tl = JSON.parse(readFileSync(join(root, 'src/timeline.json'), 'utf8'));

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const W = Number(opt('w', 3840)), H = Number(opt('h', 2160)), FPS = Number(opt('fps', 60));
const SIDE = Number(opt('n', 512));
const codec = opt('codec', 'h264');
const crf = opt('crf', codec === 'h265' ? '18' : '16');
const preset = opt('preset', 'slow');
const browserPath = opt('browser', process.env.CHROME_PATH);
const audioFile = join(root, 'public', tl.audio);
const withAudio = !flag('no-audio') && existsSync(audioFile);
const ext = codec === 'prores' ? '.mov' : '.mp4';

// ---------- 构建 ----------
if (flag('build') || !existsSync(join(root, 'dist/index.html'))) {
  console.log('构建网页…');
  const r = spawnSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ---------- 编码参数 ----------
function videoArgs() {
  const colour = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'];
  if (codec === 'prores') {
    return ['-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv422p10le', '-c:v', 'prores_ks', '-profile:v', '3', ...colour];
  }
  if (codec === 'h265') {
    return ['-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p10le', '-c:v', 'libx265', '-preset', preset, '-crf', crf, '-tag:v', 'hvc1', ...colour];
  }
  return ['-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', preset, '-crf', crf,
    '-profile:v', 'high', '-level:v', '5.2', '-g', String(FPS * 2), ...colour];
}

// ---------- 静态服务 + 帧接收 ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };

function startServer(onFrame, onDone) {
  const dist = join(root, 'dist');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/__frame') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => onFrame(Number(url.searchParams.get('i')), Buffer.concat(chunks)).then(
        () => res.end('ok'), (e) => { res.statusCode = 500; res.end(String(e)); }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/__done') { res.end('ok'); onDone(); return; }
    let p = join(dist, decodeURIComponent(url.pathname));
    if (!p.startsWith(dist)) { res.statusCode = 403; return res.end(); }
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream');
    createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// ---------- 渲染一段 ----------
async function renderRange(from, to, out, audio) {
  mkdirSync(dirname(out), { recursive: true });
  const frames = Math.round(to * FPS) - Math.round(from * FPS);
  const tmp = out + '.part' + ext;
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0'];
  if (audio) ffArgs.push('-ss', String(from), '-t', String(to - from), '-i', audioFile, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k', '-shortest');
  ffArgs.push(...videoArgs(), '-movflags', '+faststart', tmp);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((ok, bad) => ff.on('exit', (c) => (c === 0 ? ok() : bad(new Error('ffmpeg 退出码 ' + c)))));

  let expect = Math.round(from * FPS);
  const t0 = Date.now();
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  const server = await startServer(async (i, buf) => {
    if (i !== expect) throw new Error(`帧序号错位：收到 ${i}，应为 ${expect}`);
    if (buf.length !== W * H * 4) throw new Error(`帧大小不对：${buf.length}`);
    expect++;
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    const n = expect - Math.round(from * FPS);
    if (n % FPS === 0 || n === frames) {
      const el = (Date.now() - t0) / 1000, rate = n / el;
      process.stdout.write(`\r  ${out}: ${n}/${frames} 帧  ${rate.toFixed(2)} 帧/秒  剩余约 ${Math.round((frames - n) / rate)} 秒   `);
    }
  }, () => resolveDone());

  const browser = await chromium.launch({
    executablePath: browserPath,
    channel: browserPath ? undefined : 'chrome',
    headless: !flag('headed'),
    args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (!/^\[export\]|GL Driver Message|Failed to load resource/.test(m.text())) console.log('  [page]', m.text()); });
  page.on('pageerror', (e) => { console.error('  [page error]', e); process.exitCode = 1; resolveDone(); });
  const { port } = server.address();
  await page.goto(`http://127.0.0.1:${port}/?export&w=${W}&h=${H}&fps=${FPS}&from=${from}&to=${to}&n=${SIDE}`);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`  GPU: ${renderer}`);
  await done;
  await browser.close();
  server.close();
  ff.stdin.end();
  await ffDone;
  if (expect - Math.round(from * FPS) !== frames) throw new Error('帧数不完整');
  renameSync(tmp, out);
  console.log(`\n  完成：${out}`);
}

// ---------- 主流程 ----------
const stamp = `${W}x${H}_${FPS}fps`;
if (flag('full')) {
  // 全片按章节分段：每段单独文件，已完成的段落会跳过，可以随时中断后续跑
  const spb = 60 / tl.bpm;
  const starts = tl.chapters.map((c) => {
    const s = tl.shots.find((s) => s.ch === c.id);
    return (s.bars[0] - 1) * tl.beatsPerBar * spb + tl.offset;
  });
  const lastShot = tl.shots[tl.shots.length - 1];
  const end = Math.max(tl.duration, lastShot.bars[1] * tl.beatsPerBar * spb + tl.offset);
  starts[0] = 0;
  const segDir = join(root, 'out', `segments_${stamp}`);
  const list = [];
  for (let i = 0; i < starts.length; i++) {
    // 段落边界吸附到整帧
    const from = Math.round(starts[i] * FPS) / FPS, to = Math.round((starts[i + 1] ?? end) * FPS) / FPS;
    const seg = join(segDir, `${String(i).padStart(2, '0')}_${tl.chapters[i].id}${ext}`);
    list.push(seg);
    if (existsSync(seg)) { console.log(`跳过已完成：${seg}`); continue; }
    console.log(`第 ${i} 段 ${tl.chapters[i].zh}：${from.toFixed(2)}s – ${to.toFixed(2)}s`);
    await renderRange(from, to, seg, false);
  }
  const out = resolve(opt('out', join(root, 'out', `model-train-world_${stamp}${ext}`)));
  const listFile = join(segDir, 'list.txt');
  writeFileSync(listFile, list.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile];
  if (withAudio) args.push('-i', audioFile, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k', '-shortest');
  args.push('-c:v', 'copy', '-movflags', '+faststart', out);
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  console.log(`全片完成：${out}`);
} else {
  const from = Number(opt('from', 0)), to = Number(opt('to', 10));
  const out = resolve(opt('out', join(root, 'out', `preview_${from}-${to}s_${stamp}${ext}`)));
  await renderRange(from, to, out, withAudio);
}
