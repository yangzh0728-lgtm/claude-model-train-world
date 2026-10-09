// 主时钟：把“秒”换算成拍、小节、镜头。所有画面都只由这里算出的时间推导，
// 所以实时播放、拖动进度条和离线逐帧导出得到的是完全相同的画面。

export function createClock(tl) {
  const bpb = tl.beatsPerBar;
  const spb = 60 / tl.bpm;
  const beats = Array.isArray(tl.beats) && tl.beats.length > 1 ? tl.beats : null;

  // 秒 → 拍（浮点）。有真实节拍表（librosa 导出的每拍时间）时按节拍表插值，
  // 否则按固定 BPM 和偏移量计算。
  function beatAt(t) {
    if (!beats) return (t - tl.offset) / spb;
    if (t <= beats[0]) return (t - beats[0]) / (beats[1] - beats[0]);
    let lo = 0, hi = beats.length - 1;
    if (t >= beats[hi]) return hi + (t - beats[hi]) / (beats[hi] - beats[hi - 1]);
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (beats[mid] <= t) lo = mid; else hi = mid;
    }
    return lo + (t - beats[lo]) / (beats[hi] - beats[lo]);
  }

  // 拍 → 秒（导出分段、跳转用）
  function timeAt(beat) {
    if (!beats) return tl.offset + beat * spb;
    const i = Math.max(0, Math.min(beats.length - 2, Math.floor(beat)));
    return beats[i] + (beat - i) * (beats[i + 1] - beats[i]);
  }

  const shots = tl.shots.map((s, i) => ({
    ...s,
    index: i,
    startBeat: (s.bars[0] - 1) * bpb,
    endBeat: s.bars[1] * bpb,
    get len() { return this.endBeat - this.startBeat; },
  }));
  const chapterIndex = Object.fromEntries(tl.chapters.map((c, i) => [c.id, i]));

  function shotAtBeat(beat) {
    for (let i = shots.length - 1; i >= 0; i--) if (beat >= shots[i].startBeat) return shots[i];
    return shots[0];
  }

  // 某一时刻的完整时间信息
  function at(t) {
    const beat = beatAt(t);
    const shot = shotAtBeat(beat);
    const lb = beat - shot.startBeat;
    return {
      t,
      beat,
      bar: Math.floor(beat / bpb) + 1,
      beatInBar: ((beat % bpb) + bpb) % bpb,
      shot,
      chapter: tl.chapters[chapterIndex[shot.ch]],
      chapterNo: chapterIndex[shot.ch],
      lb,                      // 镜头内的拍
      len: shot.len,           // 镜头总拍数
      p: Math.min(1, Math.max(0, lb / shot.len)),
      spb,
    };
  }

  const endBeat = shots[shots.length - 1].endBeat;
  return { at, beatAt, timeAt, shots, endBeat, duration: Math.max(tl.duration, timeAt(endBeat)), bpb };
}
