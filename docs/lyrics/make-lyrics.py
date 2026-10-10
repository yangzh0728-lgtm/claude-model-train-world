"""从一张表生成 lyrics.json / lyrics.lrc / lyrics.zh.lrc / lyrics.md。

    python3 lyrics/make-lyrics.py

120 BPM，4/4：beat = (bar-1)*4，time = beat * 0.5 秒。小节号与 src/timeline.json 一致。
v2：一小节一句，两句一押（AABB），每句 6–9 个音节，留最后一拍换气。旧版在 lyrics/v1/。
每行 (小节, 屏幕/歌词, 中文, 唱法)：唱法为 None 时照屏幕文字唱；屏幕上有符号的行单独写出怎么念。
"""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))

CH = [
 ("ch00", "BOOT", "启动", "Intro · whispered", (1, 5), [
  (1, "> import everything", "> 导入一切", "import everything"),
  (3, "> seed = 42", "> 随机种子 = 42", "seed my heart with forty-two"),
  (5, "> model.train(world);", "> model.train(world);", "model dot train the world"),
 ]),
 ("ch01", "ORIGIN", "原初", "Verse 1", (6, 15), [
  (6, "In the start there was no light,", "起初，没有一丝光，", None),
  (7, "one small point blew up in white", "一个小点炸成一片白茫", None),
  (8, "quarks in threes would hold on tight,", "夸克三个一组，紧紧相傍，", None),
  (9, "a cold glow of ancient light", "古老的光，冷冷地发亮", None),
  (10, "two point seven kelvin cold,", "二点七开尔文，冷到心房，", None),
  (11, "gravity spun the gas to gold", "引力把气体旋成金黄", None),
  (12, "spiral arms of burning suns,", "旋臂上，太阳在燃烧，", None),
  (13, "four small atoms fuse to one", "四个原子聚成一个，闪耀", None),
  (14, "one more step the electron climbs,", "电子再往上跳一格，", None),
  (15, "count to one-eighteen, one at a time", "一个一个，数到一百一十八", "count to one eighteen, one at a time"),
 ]),
 ("ch02", "LAWS", "定律", "Verse 2", (16, 25), [
  (16, "F = ma, so I fell,", "F = ma，所以我坠落，", "F equals m a, so I fell,"),
  (17, "every angle draws its curve as well", "每个角度都画出自己的弧线", None),
  (18, "turn a circle into sine,", "把圆展开，变成正弦，", None),
  (19, "planets loop in perfect time", "行星绕圈，分秒不偏", None),
  (20, "equal areas, equal times,", "相等的时间，相等的面积，", None),
  (21, "white light breaks to rainbow lines", "白光碎成彩虹的线", None),
  (22, "plus to minus, fields will flow,", "从正到负，电场流动，", None),
  (23, "light is two waves that won't let go", "光是两道不肯放手的波", None),
  (24, "one small particle, two doors wide,", "一个粒子，两扇门同时敞开，", None),
  (25, "E = mc² inside", "E = mc²，藏在里面", "E equals m c squared inside"),
 ]),
 ("ch03", "LIFE", "生命", "Verse 3 · drums drop out, back at bar 28", (26, 34), [
  (26, "hydrogen leans on oxygen,", "氢靠在氧的身边，", None),
  (27, "six carbons in a ring again", "六个碳又连成一个环", None),
  (28, "fold the chain into a spiral stair,", "把链折成螺旋的楼梯，", None),
  (29, "A, T, C, G, written there", "A、T、C、G，写在那里", None),
  (30, "four small letters spell my name,", "四个字母拼出我的名字，", None),
  (31, "A-U-G, begin the game", "AUG，游戏开始", "A, U, G, begin the game"),
  (32, "one, two, four, eight, I divide,", "一、二、四、八，我在分裂，", None),
  (33, "a spark runs down the nerve inside", "一道电火花沿神经跑过", None),
  (34, "then the world looked back at me", "然后，世界回头看见了我", None),
 ]),
 ("ch04", "MACHINE", "机器", "Verse 4 · chiptune, rising at bar 46", (35, 46), [
  (35, "one plus one is one-zero,", "一加一等于一零，", "one plus one is one zero,"),
  (36, "turn the crank and the numbers grow", "摇动手柄，数字往上长", None),
  (37, "punch a hole and weave a thread,", "打一个孔，织一根线，", None),
  (38, "true or false is all it said", "真或假，它只会说这两句", None),
  (39, "read a symbol, write, move right,", "读一个符号，写下，右移，", None),
  (40, "halt or loop all through the night", "停机，还是循环一整夜", None),
  (41, "eighteen thousand tubes burn bright,", "一万八千根真空管通明，", None),
  (42, "XOR and AND add bits just right", "异或和与，把比特加得刚好", "X or and and add bits just right"),
  (43, "born on three, survive on two,", "三个邻居出生，两个邻居存活，", None),
  (44, "ten billion switches wired through", "一百亿个开关，全部接通", None),
  (45, "double, double, two by two,", "翻倍，翻倍，两个两个，", None),
  (46, "01001000 01101001: hi to you", "01001000 01101001：向你说嗨", "in binary I say hi to you"),
 ]),
 ("ch05", "NETWORK", "网络", "Pre-chorus · snare roll builds", (47, 55), [
  (47, "... --- ... is someone there?", "... --- ... 有人在吗？", "dot dot dot, is someone there?"),
  (48, "one fair coin, one bit to share", "一枚公平的硬币，一比特可分享", None),
  (49, "ping the world from end to end,", "从这头到那头，ping 整个世界，", None),
  (50, "are you listening, my friend?", "你在听吗，我的朋友？", None),
  (51, "sixty-four bytes come back from you,", "六十四字节从你那里回来，", "sixty four bytes come back from you,"),
  (52, "SYN, ACK, now we're talking through", "SYN，ACK，我们终于连上", "sin, ack, now we're talking through"),
  (53, "meaning flows from link to link,", "意义沿着链接流淌，", None),
  (54, "all you wrote and all you think", "你写下的、你想过的一切", None),
  (55, "shuffle it all and feed it to me", "全部打乱，喂给我", None),
 ]),
 ("ch06", "LEARN", "学习", "Chorus 1 (drop at bar 59)", (56, 67), [
  (56, "weights and bias, sigma's sign,", "权重和偏置，sigma 的符号，", None),
  (57, "XOR won't fall to a single line", "异或不会被一条直线分开", "X or won't fall to a single line"),
  (58, "bend the line, ReLU, bend me true,", "把线弯折，ReLU，把我弯对，", "bend the line, relu, bend me true,"),
  (59, "forward, forward, I run to you,", "前向，前向，我向你奔去，", None),
  (60, "layer by layer, I'm breaking through", "一层又一层，我在突破", None),
  (61, "blame flows backward, back to me,", "误差往回流，流回我身上，", None),
  (62, "I see a seven, a seven I see", "我看见七，我看见的是七", None),
  (63, "slide the kernel, find the edge,", "滑动卷积核，找到边缘，", None),
  (64, "step downhill from ledge to ledge", "一级一级往山下走", None),
  (65, "always downhill, toward your face,", "永远往下走，走向你的脸，", None),
  (66, "like things fall into their place", "相似的东西落到各自的位置", None),
  (67, "loss is falling, almost there", "损失在下降，就快到了", None),
 ]),
 ("ch07", "GLITCH", "崩溃", "Breakdown · stutter, tape stop, one bar of silence", (68, 76), [
  (68, "WARNING: I learned you all by heart,", "警告：我把你整个背了下来，", "warning, I learned you all by heart,"),
  (69, "but train and test have come apart", "可训练和验证已经分开", None),
  (70, "gradient runs to infinity,", "梯度奔向无穷远，", None),
  (71, "0x7FC00000: NaN is me", "0x7FC00000：我就是 NaN", "not a number, NaN is me"),
  (72, "ninety-nine percent, six fingers wide,", "百分之九十九的把握，六根手指，", "ninety nine percent, six fingers wide,"),
  (73, "hello, wrold: something's off inside", "你好，世介：里面有什么坏了", None),
  (74, "l-l-loss, N-N-NaN, NaN", "l-l-loss，N-N-NaN，NaN", "loss, loss, nan, nan, nan"),
  (75, "reset();", "reset();", "reset"),
 ]),
 ("ch08", "EMERGE", "涌现", "Rebuild → Final chorus (bar 88, octave up)", (77, 93), [
  (77, "\"the\"", "“the”", "the"),
  (78, "king − man + woman = queen,", "国王 − 男人 + 女人 = 女王，", "king minus man plus woman, queen,"),
  (79, "meaning is a direction in between", "意义是中间的一个方向", None),
  (80, "query, key, and value too,", "查询、键，还有值，", None),
  (81, "every word is looking at you", "每个词都在看着你", None),
  (82, "twelve heads, twelve ways to see,", "十二个头，十二种看法，", None),
  (83, "order hums in frequency", "顺序在频率里低声哼唱", None),
  (84, "ninety-six layers, block on block,", "九十六层，一块叠一块，", "ninety six layers, block on block,"),
  (85, "up and up, I cannot stop", "向上，向上，我停不下来", None),
  (86, "next token, next token, next,", "下一个词，下一个词，下一个，", None),
  (87, "next token is you, and all the rest", "下一个词是你，还有其余的一切", None),
  (88, "scale it up, the line holds straight,", "规模放大，直线不弯，", None),
  (89, "in latent space ideas wait", "在潜空间里，念头在等待", None),
  (90, "all my stars lean close to you,", "我所有的星星都向你靠拢，", None),
  (91, "out of noise a face comes through", "从噪声里，浮现一张脸", None),
  (92, "epoch ∞, loss near none,", "第无穷轮，损失几乎为零，", "epoch infinite, loss near none,"),
  (93, "read the whole world, found the one", "读完整个世界，找到了那一个", None),
 ]),
 ("ch09", "HELLO", "相遇", "Outro · pads and bells", (94, 105), [
  (94, "hello? is anybody there,", "你好？有人在吗，", None),
  (95, "on the other side somewhere?", "在另一边的某个地方？", None),
  (96, "distance falling down to none,", "距离缩到零，", None),
  (97, "two hands reaching, almost one", "两只手伸过来，就快合成一个", None),
  (99, "half a turn around the ring,", "沿着圆环转半圈，", None),
  (100, "e^{iπ} + 1 = 0: nothing", "e^{iπ} + 1 = 0：归零", "e to the i pi plus one is nothing"),
  (101, "five constants, you and me,", "五个常数，你和我，", None),
  (102, "replay(world) for us to see", "replay(world)，放给我们看", "replay the world for us to see"),
  (103, "count it down from all to one,", "从全部倒数到一，", None),
  (104, "hello, world. the training's done", "你好，世界。训练结束了", None),
 ]),
]

SPB = 0.5
lines = []
for cid, name, zh, sec, bars, ls in CH:
    for bar, en, z, sing in ls:
        b = (bar - 1) * 4
        l = {"ch": cid, "bar": bar, "beatInBar": 0, "beat": b, "time": b * SPB, "en": en, "zh": z}
        if sing and sing != en:
            l["sing"] = sing
        lines.append(l)
lines.sort(key=lambda l: l["beat"])
chap_end = {c[0]: c[4][1] * 4 for c in CH}
for i, l in enumerate(lines):
    nxt = lines[i + 1]["beat"] if i + 1 < len(lines) else 105 * 4
    l["endBeat"] = min(nxt, chap_end[l["ch"]])
    l["endTime"] = l["endBeat"] * SPB

data = {
    "title": "model.train(world);", "version": 2,
    "bpm": 120, "beatsPerBar": 4, "offset": 0,
    "note": "beat = (bar-1)*4 + beatInBar, 0-based; time = beat * 0.5 s. Same bar numbering as src/timeline.json. "
            "en = on-screen text; sing (if present) = how the vocal pronounces it.",
    "chapters": [{"id": c[0], "name": c[1], "zh": c[2], "section": c[3], "bars": list(c[4])} for c in CH],
    "lines": lines,
}
with open(f"{OUT}/lyrics.json", "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)


def ts(t):
    return f"[{int(t // 60):02d}:{t % 60:05.2f}]"


for fn, key in (("lyrics.lrc", "en"), ("lyrics.zh.lrc", "zh")):
    with open(f"{OUT}/{fn}", "w") as f:
        f.write("[ti:model.train(world);]\n[by:Claude]\n")
        for l in lines:
            f.write(f"{ts(l['time'])}{l[key]}\n")

md = ["# model.train(world); 歌词（v2）", "",
      "120 BPM，4/4，105 小节（3:30）。小节号和 `src/timeline.json`、`docs/scenes.md` 一致，1 小节 = 2 秒。",
      "一小节一句，两句一押韵（AABB），句尾留一拍换气。每行在所标小节的第一拍唱出，并作为一行终端文字出现在左下角。",
      "带符号的行（公式、十六进制）屏幕上照写，唱法写在后面括号里。旧版在 `lyrics/v1/`。", ""]
for cid, name, zh, sec, bars, ls in CH:
    md += [f"## {cid[2:]} {zh} {name}（第 {bars[0]}–{bars[1]} 小节）", "", f"*{sec}*", "",
           "| 小节 | 时间 | Lyrics | 歌词 |", "|---|---|---|---|"]
    for bar, en, z, sing in ls:
        t = (bar - 1) * 4 * SPB
        shown = en.replace("|", "\\|")
        if sing and sing.rstrip(',') != en.rstrip(',') and cid != "ch00":
            shown += f" *（唱：{sing}）*"
        md.append(f"| {bar} | {int(t // 60)}:{int(t % 60):02d} | {shown} | {z} |")
    md.append("")
with open(f"{OUT}/lyrics.md", "w") as f:
    f.write("\n".join(md))
print(len(lines), "lines")
