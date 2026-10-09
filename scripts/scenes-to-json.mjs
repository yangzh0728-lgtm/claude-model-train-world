// 把 docs/scenes.md 的场景表转成 src/scenes.json（镜头 id、章节、小节、画面、屏幕文字），
// 并同步 timeline.json 的 shots。改了场景表后运行：node scripts/scenes-to-json.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync('docs/scenes.md', 'utf8');
const scenes = [];
for (const line of md.split('\n')) {
  const m = line.match(/^\| (\d[a-z]) \| (\d+)(?:–(\d+))? \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/);
  if (!m) continue;
  const [, id, b0, b1, styleZh, desc, text, note] = m;
  const style = { 纸面插图: 'paper', 工程图纸: 'sheet' }[styleZh] ?? 'dark';
  const raw = note === '（无）' ? '' : note;
  const [title, caption] = style === 'dark' ? ['', raw] : raw.split(' · ');
  scenes.push({ id, ch: `ch0${id[0]}`, bars: [Number(b0), Number(b1 ?? b0)], style, desc, text: text.replace(/`/g, ''), title, caption });
}
writeFileSync('src/scenes.json', JSON.stringify(scenes, null, 1) + '\n');
const tl = JSON.parse(readFileSync('src/timeline.json', 'utf8'));
tl.shots = scenes.map(({ id, ch, bars }) => ({ id, ch, bars }));
writeFileSync('src/timeline.json', JSON.stringify(tl, null, 2).replace(/\[\n\s+(-?\d+|"NaN"),\n\s+(-?[\d.]+|"NaN")\n\s+\]/g, '[$1, $2]').replace(/\{\n\s+"id": ("[^"]+"),\n\s+"ch": ("[^"]+"),\n\s+"bars": (\[[^\]]+\])\n\s+\}/g, '{ "id": $1, "ch": $2, "bars": $3 }') + '\n');
console.log(`${scenes.length} 个场景`);
