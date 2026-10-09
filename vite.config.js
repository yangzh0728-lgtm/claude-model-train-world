import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 换一套时间轴（另一首歌）：TIMELINE=src/timelines/brain-dance.json npm run dev
// 时间轴里 "lyrics" 给歌词 JSON 的路径；为 null 时终端不打歌词，改用各镜头的日志。
const timeline = process.env.TIMELINE;
const alias = [];
if (timeline) {
  const tl = JSON.parse(readFileSync(timeline, 'utf8'));
  alias.push({ find: /^\.\/timeline\.json$/, replacement: resolve(timeline) });
  if (tl.lyrics !== undefined) alias.push({ find: /^\.\.\/lyrics\.json$/, replacement: resolve(tl.lyrics ?? 'src/timelines/no-lyrics.json') });
}

export default defineConfig({
  base: './',
  resolve: { alias },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  esbuild: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
