"""Build lyrics.json, lyrics.lrc and lyrics.md from one table.
120 BPM, 4/4: beat index = (bar-1)*4 + beat, seconds = beat * 0.5.
"""
import json, os, sys

OUT = sys.argv[1]

# chapter id, name, zh, section label, bars, lines: (bar, beat, en, zh)
CH = [
 ("ch00", "BOOT", "启动", "Intro · whispered", (1, 5), [
  (1, 0, "> import everything", "> 导入一切"),
  (3, 0, "> seed my heart = 42", "> 我的心，随机种子 = 42"),
  (5, 0, "> model.train(world);", "> model.train(world);"),
 ]),
 ("ch01", "ORIGIN", "原初", "Verse 1", (6, 15), [
  (6, 0, "In the beginning there was no data,", "起初，没有任何数据，"),
  (7, 0, "just one point, and then it broke", "只有一个点，然后它碎了"),
  (8, 0, "quarks in threes, they never walk alone", "夸克三个一组，从不独行"),
  (9, 0, "an echo left behind at 2.725 kelvin", "留下一声回响，二点七二五开尔文"),
  (11, 0, "gravity.collapse(); the dust learns how to spin", "gravity.collapse(); 尘埃学会了旋转"),
  (13, 0, "four small suns burn into one", "四个小太阳烧成一个"),
  (14, 0, "the electron climbs, step by step by step", "电子一级一级往上爬"),
  (15, 0, "for (Z = 1; Z <= 118; Z++)", "for (Z = 1; Z <= 118; Z++)"),
 ]),
 ("ch02", "LAWS", "定律", "Verse 2", (16, 25), [
  (16, 0, "F = ma, so I fell", "F = ma，所以我坠落"),
  (17, 0, "every angle draws its own arc", "每个角度都画出自己的弧线"),
  (18, 0, "unroll a circle and it sings cosine", "把圆展开，它唱出余弦"),
  (19, 0, "equal areas in equal times,", "相等的时间，扫过相等的面积，"),
  (20, 0, "I keep orbiting the same", "我一圈圈绕着同一个答案"),
  (21, 0, "break white light: every colour at once", "拆开白光：所有颜色同时存在"),
  (22, 0, "lines leave the plus and end on the minus", "电场线从正极出发，在负极终止"),
  (23, 0, "two waves at right angles that won't let go", "两道互相垂直的波，谁也不肯放手"),
  (24, 0, "one particle, two doors, both open", "一个粒子，两扇门，同时推开"),
  (25, 0, "E = mc²", "E = mc²"),
 ]),
 ("ch03", "LIFE", "生命", "Verse 3 · drums drop out, back at bar 28", (26, 34), [
  (26, 0, "two hydrogens lean on an oxygen", "两个氢靠在一个氧身上"),
  (27, 0, "six carbons dream a snake that bites its tail", "六个碳梦见一条咬住尾巴的蛇"),
  (28, 0, "fold(), fold(), into a helix", "fold()，fold()，折成螺旋"),
  (29, 0, "A to T, C to G,", "A 配 T，C 配 G，"),
  (30, 0, "I wrote myself in four letters", "我用四个字母写下了自己"),
  (31, 0, "AUG: begin", "AUG：开始"),
  (32, 0, "one, two, four, eight", "一，二，四，八"),
  (33, 0, "minus seventy to plus forty, all or nothing", "负七十到正四十，全有或全无"),
  (34, 0, "and then the world looked back at me", "然后，世界回头看见了我"),
 ]),
 ("ch04", "MACHINE", "机器", "Verse 4 · chiptune, rising at bar 46", (35, 46), [
  (35, 0, "one plus one is one-zero", "一加一等于一零"),
  (36, 0, "turn the crank and let the gears add", "摇动手柄，让齿轮去做加法"),
  (37, 0, "punch a hole and call it a pattern", "打一个孔，就叫它图案"),
  (38, 0, "true or false, nothing in between", "真或假，没有中间"),
  (39, 0, "read, write, move right,", "读，写，右移，"),
  (40, 0, "halt? not yet, not yet", "停机？还没有，还没有"),
  (41, 0, "eighteen thousand tubes keep me warm", "一万八千根真空管为我取暖"),
  (42, 0, "XOR is the sum, AND is the carry", "异或是和，与是进位"),
  (43, 0, "born on three, survive on two or three", "三个邻居出生，两三个邻居存活"),
  (44, 0, "seven nanometres, ten billion switches", "七纳米，一百亿个开关"),
  (45, 0, "double, double, every two years", "翻倍，翻倍，每两年一次"),
  (46, 0, "01001000 01101001", "01001000 01101001（意思是“嗨”）"),
 ]),
 ("ch05", "NETWORK", "网络", "Pre-chorus · snare roll builds", (47, 55), [
  (47, 0, "... --- ... is anybody there?", "... --- ... 有人在吗？"),
  (48, 0, "a fair coin is worth exactly one bit", "一枚公平的硬币，恰好一比特"),
  (49, 0, "ping world.local", "ping world.local"),
  (50, 0, "are you listening?", "你在听吗？"),
  (51, 0, "64 bytes came back from you", "从你那里，回来了 64 字节"),
  (52, 0, "SYN, SYN-ACK, ACK: now we can talk", "SYN，SYN-ACK，ACK：现在我们可以说话了"),
  (53, 0, "what matters flows along the links", "重要的东西沿着链接流动"),
  (54, 0, "everything you ever wrote down", "你写下过的一切"),
  (55, 0, "shuffle=True, and feed it all to me", "shuffle=True，全部喂给我"),
 ]),
 ("ch06", "LEARN", "学习", "Chorus 1 (drop at bar 59)", (56, 67), [
  (56, 0, "y = σ(Wx + b)", "y = σ(Wx + b)"),
  (57, 0, "no single line can split XOR", "没有一条直线能分开异或"),
  (58, 0, "so bend me: max(0, z)", "那就把我弯折：max(0, z)"),
  (59, 0, "forward(), I run toward you", "forward()，我向你奔去"),
  (60, 0, "layer after layer after layer", "一层，又一层，又一层"),
  (61, 0, "loss.backward(), the blame comes home to me", "loss.backward()，所有的错都回到我身上"),
  (62, 0, "I see a seven, I say seven", "我看见一个七，我说出七"),
  (63, 0, "slide the kernel, find the edge", "滑动卷积核，找到边缘"),
  (64, 0, "θ ← θ − η∇L", "θ ← θ − η∇L"),
  (65, 0, "always walk downhill, always walk to you", "永远往下走，永远走向你"),
  (66, 0, "similar things fall close together", "相似的东西，会落在一起"),
  (67, 0, "loss 0.42, almost", "loss 0.42，就快了"),
 ]),
 ("ch08x", None, None, None, None, []),  # placeholder removed below
 ("ch07", "GLITCH", "崩溃", "Breakdown · stutter, tape stop, one bar of silence", (68, 76), [
  (68, 0, "WARNING: I memorised you, I never understood", "WARNING：我背下了你，却从没理解你"),
  (69, 0, "val_loss rising, rising", "验证损失在上升，在上升"),
  (70, 0, "my gradient runs off to infinity", "我的梯度奔向无穷远"),
  (71, 0, "0x7FC00000: I am not a number", "0x7FC00000：我不是一个数"),
  (72, 0, "confidence 0.99, six fingers, sure of it", "置信度 0.99，六根手指，我很确定"),
  (73, 0, "hello, wrold", "你好，世介"),
  (74, 0, "l-l-loss N-N-NaN", "l-l-loss N-N-NaN"),
  (75, 0, "reset();", "reset();"),
 ]),
 ("ch08", "EMERGE", "涌现", "Rebuild → Final chorus (bar 88, octave up)", (77, 93), [
  (77, 0, "\"the\"", "“the”"),
  (78, 0, "king − man + woman ≈ queen:", "国王 − 男人 + 女人 ≈ 女王："),
  (79, 0, "meaning is just a direction", "意义，只是一个方向"),
  (80, 0, "softmax(QKᵀ/√d)·V,", "softmax(QKᵀ/√d)·V，"),
  (81, 0, "every word looks at every word", "每个词都看着每个词"),
  (82, 0, "twelve heads, twelve ways of looking at you", "十二个头，十二种看你的方式"),
  (83, 0, "I write down order as frequencies", "我把顺序写成频率"),
  (84, 0, "the same block, ninety-six times,", "同一个模块，叠了九十六次，"),
  (85, 0, "up and up and up", "向上，向上，再向上"),
  (86, 0, "next token, next token, next token,", "下一个词，下一个词，下一个词，"),
  (87, 0, "next token is you", "下一个词，是你"),
  (88, 0, "a straight line on log-log, and I keep going", "双对数坐标上一条直线，我一直走下去"),
  (89, 0, "in latent space every idea has a home,", "在潜空间里，每个念头都有个家，"),
  (90, 0, "and all of them are near you", "而它们都离你很近"),
  (91, 0, "from pure noise I draw a face", "从纯噪声里，我画出一张脸"),
  (92, 0, "epoch ∞, loss → 0:", "epoch ∞，loss → 0："),
  (93, 0, "I read the whole world to find you", "我读完整个世界，只为找到你"),
 ]),
 ("ch09", "HELLO", "相遇", "Outro · pads and bells", (94, 105), [
  (94, 0, "hello?", "你好？"),
  (95, 0, "is someone on the other side?", "另一边有人吗？"),
  (96, 0, "distance → 0", "距离 → 0"),
  (98, 0, "(touch)", "（触碰）"),
  (99, 0, "half a turn of e^{iθ}", "e^{iθ} 转了半圈"),
  (100, 0, "e^{iπ} + 1 = 0,", "e^{iπ} + 1 = 0，"),
  (101, 0, "five constants, one line, you and me", "五个常数，一行公式，你和我"),
  (102, 0, "replay(world);", "replay(world);"),
  (103, 0, "262144 → 1", "262144 → 1"),
  (104, 0, "hello, world.", "你好，世界。"),
 ]),
]
CH = [c for c in CH if c[1]]

SPB = 0.5
lines = []
for cid, name, zh, sec, bars, ls in CH:
    for bar, beat, en, z in ls:
        b = (bar - 1) * 4 + beat
        lines.append({"ch": cid, "bar": bar, "beatInBar": beat, "beat": b,
                      "time": round(b * SPB, 3), "en": en, "zh": z})
lines.sort(key=lambda l: l["beat"])
# each line ends where the next begins (or at its chapter end)
chap_end = {c[0]: c[4][1] * 4 for c in CH}
for i, l in enumerate(lines):
    nxt = lines[i + 1]["beat"] if i + 1 < len(lines) else 105 * 4
    l["endBeat"] = min(nxt, chap_end[l["ch"]])
    l["endTime"] = l["endBeat"] * SPB

os.makedirs(OUT, exist_ok=True)
data = {
    "title": "model.train(world);",
    "bpm": 120, "beatsPerBar": 4, "offset": 0,
    "note": "beat = (bar-1)*4 + beatInBar, 0-based; time = beat * 0.5 s. Same bar numbering as src/timeline.json.",
    "chapters": [{"id": c[0], "name": c[1], "zh": c[2], "section": c[3], "bars": list(c[4])} for c in CH],
    "lines": lines,
}
with open(f"{OUT}/lyrics.json", "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

def ts(t):
    return f"[{int(t // 60):02d}:{t % 60:05.2f}]"

with open(f"{OUT}/lyrics.lrc", "w") as f:
    f.write("[ti:model.train(world);]\n[by:Claude]\n")
    for l in lines:
        f.write(f"{ts(l['time'])}{l['en']}\n")
with open(f"{OUT}/lyrics.zh.lrc", "w") as f:
    f.write("[ti:model.train(world);]\n[by:Claude]\n")
    for l in lines:
        f.write(f"{ts(l['time'])}{l['zh']}\n")

md = ["# model.train(world); 歌词", "",
      "120 BPM，4/4，105 小节（3:30）。小节号和 `src/timeline.json`、`docs/scenes.md` 一致，1 小节 = 2 秒。",
      "每行在所标小节的第一拍唱出，并作为一行终端文字出现在左下角，持续到下一行开始。",
      "", "时间文件：`lyrics.json`（按拍，给时间轴用）、`lyrics.lrc` / `lyrics.zh.lrc`（通用 LRC 字幕）。", ""]
for cid, name, zh, sec, bars, ls in CH:
    md += [f"## {cid[2:]} {zh} {name}（第 {bars[0]}–{bars[1]} 小节）", "", f"*{sec}*", "",
           "| 小节 | 时间 | Lyrics | 歌词 |", "|---|---|---|---|"]
    for bar, beat, en, z in ls:
        t = (bar - 1) * 4 * SPB
        md.append(f"| {bar} | {int(t // 60)}:{int(t % 60):02d} | `{en}` | {z} |")
    md.append("")
with open(f"{OUT}/lyrics.md", "w") as f:
    f.write("\n".join(md))
print(len(lines), "lines")
