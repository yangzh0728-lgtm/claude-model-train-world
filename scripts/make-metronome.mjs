// 生成占位节拍器音轨（选歌前用）：默认 120 BPM、4/4 拍、210 秒，小节第一拍为高音。
// 用法：node scripts/make-metronome.mjs [bpm] [秒数] [输出路径]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const bpm = Number(process.argv[2] ?? 120);
const seconds = Number(process.argv[3] ?? 210);
const out = process.argv[4] ?? 'public/audio/metronome.wav';
const rate = 48000;
const beatsPerBar = 4;

const n = Math.round(seconds * rate);
const pcm = new Int16Array(n);
const beatLen = 60 / bpm;
for (let b = 0; b * beatLen < seconds; b++) {
  const start = Math.round(b * beatLen * rate);
  const down = b % beatsPerBar === 0;
  const freq = down ? 1760 : 880;
  const amp = down ? 0.6 : 0.35;
  const len = Math.round(0.06 * rate);
  for (let i = 0; i < len && start + i < n; i++) {
    const t = i / rate;
    pcm[start + i] = Math.round(32767 * amp * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 60));
  }
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + n * 2, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(n * 2, 40);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, Buffer.from(pcm.buffer)]));
console.log(`wrote ${out}: ${bpm} BPM, ${seconds}s`);
