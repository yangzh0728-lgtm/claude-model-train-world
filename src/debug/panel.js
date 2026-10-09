// 调试面板：显示拍号/镜头，键盘跳转
//   空格 播放/暂停   ←/→ 前后一小节   ↑/↓ 上/下一个镜头   0–9 跳到第几章   H 隐藏面板
export function createDebug({ audio, clock, tl }) {
  const el = document.createElement('div');
  el.id = 'debug';
  el.innerHTML = `<div class="row" id="dbg-info"></div>
    <input id="dbg-seek" type="range" min="0" max="${clock.duration}" step="0.01" value="0">
    <div class="hint">空格 播放/暂停 · ←→ 小节 · ↑↓ 镜头 · 0–9 章节 · H 隐藏</div>`;
  document.body.appendChild(el);
  const info = el.querySelector('#dbg-info');
  const seek = el.querySelector('#dbg-seek');

  // 没有音频文件时用系统时钟代替
  let audioOk = true;
  audio.addEventListener('error', () => { audioOk = false; });
  let fakeT = 0, fakePlaying = false, last = performance.now();

  const time = () => {
    const now = performance.now();
    if (!audioOk) { if (fakePlaying) fakeT += (now - last) / 1000; last = now; return fakeT; }
    return audio.currentTime;
  };
  const set = (t) => {
    t = Math.max(0, Math.min(clock.duration, t));
    if (audioOk) audio.currentTime = t; else fakeT = t;
  };
  const toggle = () => {
    if (!audioOk) { fakePlaying = !fakePlaying; last = performance.now(); return; }
    if (audio.paused) audio.play(); else audio.pause();
  };

  seek.addEventListener('input', () => set(Number(seek.value)));
  window.addEventListener('keydown', (e) => {
    const t = time();
    const beat = clock.beatAt(t);
    const shotIdx = clock.at(t).shot.index;
    if (e.code === 'Space') { toggle(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') set(clock.timeAt((Math.floor(beat / clock.bpb) + 1) * clock.bpb));
    else if (e.key === 'ArrowLeft') set(clock.timeAt((Math.ceil(beat / clock.bpb) - 1) * clock.bpb));
    else if (e.key === 'ArrowDown') set(clock.timeAt(clock.shots[Math.min(clock.shots.length - 1, shotIdx + 1)].startBeat));
    else if (e.key === 'ArrowUp') set(clock.timeAt(clock.shots[Math.max(0, shotIdx - 1)].startBeat));
    else if (/^[0-9]$/.test(e.key)) {
      const s = clock.shots.find((s) => s.ch === tl.chapters[Number(e.key)].id);
      if (s) set(clock.timeAt(s.startBeat));
    } else if (e.key === 'h' || e.key === 'H') el.classList.toggle('hidden');
  });

  return {
    time,
    show(i) {
      info.textContent = `${i.t.toFixed(2)}s  小节 ${i.bar}.${Math.floor(i.beatInBar) + 1}  镜头 ${i.shot.id}  ${i.chapter.zh}`;
      if (document.activeElement !== seek) seek.value = i.t;
    },
  };
}
