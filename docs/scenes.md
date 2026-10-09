# 场景表（加密版）

原作每章塞三到六个场景，靠场景密度制造紧张感。这一版把全片从 30 个镜头加密到 **86 个场景**，平均一到两个小节（2–4 秒）换一次画面，副歌段落每小节必换。
章节边界和总长不变（120 BPM 占位，105 小节，3:30）。每个场景都有一个具体的科学对象和一行屏幕文字。

小节号从 1 开始，1 小节 = 4 拍 = 2 秒。

## 画面风格

以**暗**为主：黑底、发光粒子，约八成场景用它。中间穿插两种纸面页，每次只停一到两个小节，给节奏换气：

- **纸面插图**：米色纸底，粒子变成深色墨线，像教科书里的配图。画面上压一个金色衬线大标题，右下角是斜体图注 “Fig. x.y …”。
- **工程图纸**：米色纸底，上下各一条通栏细线，左上是编号小字附注 NOTES，右下是标题栏（名称、比例、图号），中间是加宽字距的无衬线大标题。

暗场景在右下角也会配一行灰色小字注解（“小字注解”一列），只在需要解释时出现。纸面场景这一列的 “·” 前面是大标题，后面是图注。
左下角的终端日志在所有风格里都保留；纸面页里改成深色墨字。

## 0 启动 Boot（第 1–5 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 0a | 1–2 | 暗 | 全黑，光标随拍闪 | `$ ./model --train world` | （无） |
| 0b | 3 | 暗 | 粒子从屏幕四边涌入，铺成一块白噪声方阵 | `seed = 42` | fig. 0.1  262,144 particles, uniform init |
| 0c | 4 | 暗 | 噪声按值排序，堆成一条高斯钟形直方图 | `w ~ N(0, 1)` | fig. 0.2  sorted by value: the bell curve |
| 0d | 5 | 暗 | 钟形曲线按拍收成一个亮点 | `model.train(world)` | fig. 0.3  all weights collapse to one point |

## 1 原初 Origin（第 6–15 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 1a | 6 | 暗 | 大爆炸，径向喷射 | `epoch 001  loss 9.81` | fig. 1.1  t = 0 |
| 1b | 7 | 暗 | 三维网格指数暴胀 | `a(t) ∝ e^{Ht}` | fig. 1.2  space grows e⁶⁰ in 10⁻³² s |
| 1c | 8 | 暗 | 夸克三三结合成质子与中子 | `uud → p⁺   udd → n⁰` | fig. 1.3  confinement: quarks never travel alone |
| 1d | 9–10 | 暗 | 宇宙微波背景：椭圆全天图上的温度涨落 | `T = 2.725 K  ΔT/T ~ 10⁻⁵` | fig. 1.4  the oldest light, 380,000 yr after |
| 1e | 11–12 | 暗 | 物质聚成三臂旋涡星系 | `gravity.collapse(gas)` | fig. 1.5  three arms, 10¹¹ stars |
| 1f | 13 | 暗 | 恒星核心：四个氢核撞成一个氦核 | `4 ¹H → ⁴He + 2e⁺ + 2ν` | fig. 1.6  0.7% of the mass becomes light |
| 1g | 14 | 暗 | 玻尔原子，电子每半拍跃迁 | `H: 1s¹  ΔE = 10.2 eV` | fig. 1.7  energy comes in steps |
| 1h | 15 | 工程图纸 | 元素周期表一格一格按拍点亮 | `Z = 1 … 118` | ELEMENTS · Fig. 1.8  118 cells, lit in order of Z |

## 2 定律 Laws（第 16–25 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 2a | 16 | 暗 | 苹果下落，落地炸开 | `F = ma` | fig. 2.1  Newton, 1687 |
| 2b | 17 | 纸面插图 | 一束抛物线轨迹按拍扇形展开 | `y = x·tanθ − gx²/(2v²cos²θ)` | TRAJECTORY · Fig. 2.2  Nine launch angles, one g. 45° goes farthest. |
| 2c | 18 | 纸面插图 | 单摆：相空间里的圆展开成正弦波 | `x = A·cos(ωt)` | OSCILLATION · Fig. 2.3  A point on a circle, unrolled in time, is a cosine. |
| 2d | 19–20 | 暗 | 开普勒椭圆轨道，行星带拖尾 | `T² ∝ a³` | fig. 2.4  equal areas in equal times |
| 2e | 21 | 暗 | 白光穿过棱镜散成光谱 | `n(λ) = A + B/λ²` | fig. 2.5  white light is every colour at once |
| 2f | 22 | 暗 | 电偶极子的电场线流动 | `∇·E = ρ/ε₀` | fig. 2.6  field lines leave + and end on − |
| 2g | 23 | 工程图纸 | 电磁波：E 与 B 两条正交正弦波向前推进 | `c = 1/√(μ₀ε₀)` | WAVE · Fig. 2.7  E ⊥ B, both ⊥ to the direction of travel |
| 2h | 24 | 暗 | 双缝干涉 | `P(x) = |ψ₁ + ψ₂|²` | fig. 2.8  one particle, two paths |
| 2i | 25 | 暗 | 最后一拍闪出 E = mc² | `E = mc²` | fig. 2.9  mass is energy |

## 3 生命 Life（第 26–34 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 3a | 26 | 纸面插图 | 两个氢一个氧结合成水分子，键角张开 | `H₂O  ∠HOH = 104.5°` | MOLECULE · Fig. 3.1  Two lone pairs bend the bond to 104.5°. |
| 3b | 27 | 暗 | 六个碳连成苯环，单双键交替闪 | `C₆H₆` | fig. 3.2  Kekulé dreamt of a snake eating its tail |
| 3c | 28 | 工程图纸 | 氨基酸链折叠成 α 螺旋 | `…Gly-Ala-Ser…` | FOLDING · Fig. 3.3  3.6 residues per turn, 5.4 Å pitch |
| 3d | 29–30 | 暗 | DNA 双螺旋旋转，碱基对按拍亮起 | `ATCG GCTA …` | fig. 3.4  3.2 × 10⁹ base pairs |
| 3e | 31 | 暗 | DNA 解旋转录成 mRNA，三联密码子翻译成蛋白质 | `AUG → Met` | fig. 3.5  64 codons → 20 amino acids |
| 3f | 32 | 暗 | 细胞按拍分裂 1→2→4→8 | `2ⁿ` | fig. 3.6  1 → 2 → 4 → 8 |
| 3g | 33 | 暗 | 神经元，动作电位沿轴突传过去 | `V: −70 mV → +40 mV` | fig. 3.7  all or nothing, 120 m/s |
| 3h | 34 | 暗 | 细胞群拼成一只眼睛，推近到瞳孔 | `epoch 120  loss 5.03` | fig. 3.8  the first camera |

## 4 机器 Machine（第 35–46 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 4a | 35 | 暗 | 算盘珠按拍上下拨 | `1 + 1 = 10₂` | fig. 4.1  place value |
| 4b | 36 | 工程图纸 | 差分机齿轮咬合转动 | `Δ²y = const   Babbage, 1822` | DIFFERENCE · Fig. 4.2  Polynomials by addition alone |
| 4c | 37 | 暗 | 提花机打孔卡一张张翻过 | `Jacquard, 1804` | fig. 4.3  the first program was a pattern |
| 4d | 38 | 纸面插图 | 布尔真值表逐行点亮 | `x² = x   Boole, 1854` | LOGIC · Fig. 4.4  Every truth is 0 or 1. |
| 4e | 39–40 | 暗 | 图灵机纸带滚动，读写头跳动 | `δ(q, a) → (q′, b, R)` | fig. 4.5  anything computable |
| 4f | 41 | 暗 | 真空管阵列，ENIAC 面板指示灯闪 | `18,000 tubes` | fig. 4.6  30 tonnes, 5,000 additions per second |
| 4g | 42 | 工程图纸 | 晶体管 → 逻辑门 → 半加器 | `S = A ⊕ B   C = A·B` | ADDER · Fig. 4.7  Sum = XOR, carry = AND |
| 4h | 43 | 暗 | 生命游戏：滑翔机枪喷出滑翔机 | `B3/S23` | fig. 4.8  two rules, endless machines |
| 4i | 44 | 暗 | 芯片平面布局，电路走线亮起 | `7 nm` | fig. 4.9  10¹⁰ transistors |
| 4j | 45 | 暗 | 摩尔定律对数曲线一路上冲 | `N ∝ 2^{t/2}` | fig. 4.10  doubling every two years |
| 4k | 46 | 暗 | 大幅拉远，芯片缩成晶圆上的一点 | `0b01001000 01101001` | fig. 4.11  "Hi" |

## 5 网络 Network（第 47–55 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 5a | 47 | 暗 | 两个节点之间的电报脉冲 | `... --- ...` | fig. 5.1  1844, Washington → Baltimore |
| 5b | 48 | 纸面插图 | 香农熵曲线，比特流穿过 | `H = −Σ p·log₂p` | ENTROPY · Fig. 5.2  A fair coin carries exactly one bit. |
| 5c | 49–50 | 暗 | 芯片卷成地球，节点按拍点亮 | `ping world.local` | fig. 5.3  ~10¹⁰ devices online |
| 5d | 51 | 暗 | 节点之间飞过数据包弧线 | `64 bytes from …` | fig. 5.4  round trip in milliseconds |
| 5e | 52 | 工程图纸 | TCP 三次握手：三支箭来回 | `SYN → SYN-ACK → ACK` | HANDSHAKE · Fig. 5.5  Three messages before the first byte |
| 5f | 53 | 暗 | 网页链接图，节点按 PageRank 放大 | `PR = (1−d)/N + d·Σ PR/L` | fig. 5.6  importance flows along links |
| 5g | 54 | 暗 | 文本语料像字符雨一样铺满画面 | `dataset: 10¹² tokens` | fig. 5.7  everything ever written down |
| 5h | 55 | 暗 | 地球展开成一张平面网格 | `DataLoader(shuffle=True)` | fig. 5.8  the world as a batch |

## 6 学习 Learn（第 56–67 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 6a | 56 | 暗 | 网格收缩成单个感知机 | `y = σ(Wx + b)` | fig. 6.1  Rosenblatt, 1958 |
| 6b | 57 | 纸面插图 | XOR 四个点，直线怎么摆都分不开 | `XOR: linearly inseparable` | SEPARABILITY · Fig. 6.2  No single line splits XOR. |
| 6c | 58 | 纸面插图 | 激活函数 sigmoid → tanh → ReLU 按拍变形 | `max(0, z)` | ACTIVATION · Fig. 6.3  Bend the line and depth becomes possible. |
| 6d | 59–60 | 暗 | 副歌第一拍爆散，重组成 5 层全连接网络，信号前向流过 | `forward()` | fig. 6.4  784 → 512 → 256 → 128 → 10 |
| 6e | 61 | 暗 | 梯度反向流回，颜色由红转蓝 | `loss.backward()` | fig. 6.5  blame flows backwards |
| 6f | 62 | 暗 | 手写数字“7”的 28×28 像素点阵 | `argmax → 7` | fig. 6.6  60,000 handwritten digits |
| 6g | 63 | 工程图纸 | 卷积核在图上滑动，特征图一层层叠起 | `(I * K)(x, y)` | CONVOLUTION · Fig. 6.7  One 3×3 kernel, slid everywhere |
| 6h | 64–65 | 暗 | 损失曲面，小球沿梯度滚向谷底 | `θ ← θ − η∇L` | fig. 6.8  always walk downhill |
| 6i | 66 | 暗 | 散乱的点自己聚成十个类簇 | `t-SNE` | fig. 6.9  similar things end up close |
| 6j | 67 | 暗 | 损失曲线一路下降 | `loss 0.42` | fig. 6.10  learning curve |

## 7 崩溃 Glitch（第 68–76 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 7a | 68 | 暗 | 小球冲过谷底，RGB 错位 | `WARNING: overfitting` | fig. 7.1  memorised, not understood |
| 7b | 69 | 暗 | 训练曲线和验证曲线反向分叉 | `val_loss ↑` | fig. 7.2  the gap is the warning |
| 7c | 70 | 暗 | 梯度爆炸，粒子飞向无穷远 | `‖∇L‖ → ∞` | fig. 7.3  step too large |
| 7d | 71 | 暗 | 32 位浮点的比特位乱翻 | `0x7FC00000 = NaN` | fig. 7.4  not a number |
| 7e | 72 | 暗 | 幻觉：粒子拼出六根手指的手 | `confidence: 0.99` | fig. 7.5  very confident, very wrong |
| 7f | 73 | 暗 | 拼错的字：hello, wrold | `hello, wrold` | fig. 7.6  close is not correct |
| 7g | 74 | 暗 | 前面所有形态块状错位、交替闪回 | `loss NaN` | fig. 7.7 |
| 7h | 75 | 暗 | 全部粒子塌缩成一个点 | `reset();` | fig. 7.8 |
| 7i | 76 | 暗 | 黑屏一拍 | （无） | （无） |

## 8 涌现 Emerge（第 77–93 小节，全片最高潮）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 8a | 77 | 暗 | 从点里蹦出第一个词元 | `"the"` | fig. 8.1  token 0 |
| 8b | 78–79 | 纸面插图 | 词向量平行四边形：king − man + woman ≈ queen | `cos(v₁, v₂) = 0.87` | EMBEDDING · Fig. 8.2  Meaning as direction: king − man + woman ≈ queen |
| 8c | 80–81 | 暗 | 注意力矩阵热力图，格子按拍亮 | `softmax(QKᵀ/√d)·V` | fig. 8.3  every word looks at every word |
| 8d | 82 | 暗 | 十二个注意力头排成网格同时闪 | `heads = 12` | fig. 8.4  twelve ways of looking |
| 8e | 83 | 工程图纸 | 位置编码：一组频率递减的正弦波叠起来 | `PE(pos, 2i) = sin(pos/10000^{2i/d})` | POSITION · Fig. 8.5  Order written as frequencies |
| 8f | 84–85 | 暗 | Transformer 块堆成高塔，数据向上流 | `× 96 layers` | fig. 8.6  the same block, stacked |
| 8g | 86–87 | 暗 | 中英词元像瀑布一样向上涌 | 词元飞速滚动 | fig. 8.7  next token, next token, next token |
| 8h | 88 | 纸面插图 | 规模定律：对数坐标里的一条直线 | `L ∝ N^{−0.076}` | SCALING · Fig. 8.8  A straight line on log–log axes |
| 8i | 89–90 | 暗 | 词元散成潜空间银河，相近概念聚团 | `latent space` | fig. 8.9  a map of ideas |
| 8j | 91 | 暗 | 扩散：纯噪声一步步去噪成一张脸 | `x_{t−1} = f(x_t, ε)` | fig. 8.10  from noise, a face |
| 8k | 92–93 | 暗 | 前面出现过的公式绕成一圈旋转 | `epoch ∞  loss → 0` | fig. 8.11  everything at once |

## 9 相遇 Hello（第 94–105 小节）

| 场景 | 小节 | 风格 | 画面 | 屏幕文字 | 小字注解 |
|---|---|---|---|---|---|
| 9a | 94–95 | 暗 | 银河收拢成两只手：人手与网络手 | `hello?` | fig. 9.1  two kinds of hand |
| 9b | 96–97 | 暗 | 两只手慢慢靠近，构图类似《创造亚当》 | `distance → 0` | fig. 9.2  after Michelangelo, 1512 |
| 9c | 98 | 暗 | 指尖相触，炸出光 | （闪白） | （无） |
| 9d | 99 | 纸面插图 | 单位圆上的 e^{iθ} 转半圈 | `e^{iθ} = cos θ + i·sin θ` | ROTATION · Fig. 9.4  Half a turn of e^{iθ} lands on −1. |
| 9e | 100–101 | 暗 | 收成欧拉公式 | `e^{iπ} + 1 = 0` | fig. 9.5  five constants, one line |
| 9f | 102 | 暗 | 每拍闪回一章：原子、DNA、芯片、地球、网络、热力图 | `replay(world)` | fig. 9.6  replay |
| 9g | 103 | 暗 | 粒子数倒数 262144 → 1 | `N: 262144 → 1` | fig. 9.7  N → 1 |
| 9h | 104–105 | 暗 | 最后一行字，光标停留，黑屏 | `hello, world.` | （无） |
