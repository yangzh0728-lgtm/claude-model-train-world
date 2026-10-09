// 章节表。还没做的章节用占位镜头：粒子拼出镜头编号，终端打出分镜描述，
// 这样全片从头到尾都能播放，随时能看整体节奏。
import ch00 from './ch00_boot.js';
import ch01 from './ch01_origin.js';
import ch02 from './ch02_laws.js';
import { shape } from '../shapes/index.js';
import { range } from '../util.js';
import { cam } from './helpers.js';

const TODO = {
  '3-1': '字形散开，重组为旋转的 DNA 双螺旋',
  '3-2': '螺旋收拢成细胞，细胞分裂成 2→4→8',
  '3-3': '细胞群形成一只眼睛轮廓',
  '4-1': '瞳孔变成差分机齿轮，按拍转动',
  '4-2': '图灵机纸带横向滚动，读写头跳动',
  '4-3': '逻辑门符号组成半加器',
  '4-4': '拉远发现是一块芯片上的一个点',
  '5-1': '芯片卷曲成地球，节点按拍点亮',
  '5-2': '节点间飞过数据包弧线',
  '5-3': '地球展开成一张平面网格',
  '6-1': '网格收缩成单个感知机',
  '6-2': '副歌第一拍爆散，重组成 5 层全连接网络',
  '6-3': '损失曲面，小球沿梯度滚向谷底',
  '7-1': '小球冲过谷底，画面 RGB 错位、扫描线',
  '7-2': '粒子拼出错误的物体（幻觉）',
  '7-3': '全部粒子塌缩成一个点，黑屏一拍',
  '8-1': '从点重生为注意力矩阵热力图',
  '8-2': '词元流如瀑布向上涌动',
  '8-3': '词元散成潜空间银河，相近概念聚团',
  '9-1': '银河收拢成两只手慢慢靠近',
  '9-2': '指尖相触爆出光，化作 e^(iπ)+1=0 → hello, world.',
};

function placeholder(id) {
  return (f) => ({
    from: f.prev().shape,
    matA: f.prev().mat,
    to: shape('text', { str: `shot ${id}`, width: 6 }),
    p: range(f.lb, 0, 4),
    stagger: 0.4,
    noise: 1,
    opacity: 0.8,
    cam: cam([0, 0, 10]),
  });
}

const built = { ch00, ch01, ch02 };

export function getShot(chId, shotId) {
  return built[chId]?.shots[shotId] ?? placeholder(shotId);
}

export function chapterOpts(chId) {
  return built[chId]?.term ?? {};
}

// 所有日志条目，换算成绝对拍号
export function collectLog(clock) {
  const out = [];
  for (const s of clock.shots) {
    const entries = built[s.ch]?.log?.[s.id] ?? (TODO[s.id] ? [[0, `# TODO ${s.id}: ${TODO[s.id]}`, { cps: 30 }]] : []);
    for (const [beat, text, opt = {}] of entries) out.push({ beat: s.startBeat + beat, text, ...opt });
  }
  return out;
}
