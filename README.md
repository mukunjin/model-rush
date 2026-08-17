# Model Rush

<p align="center">
  <img alt="Model Rush" src="assets/favicon.png" width="80">
</p>

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.148-000000?style=for-the-badge&logo=threedotjs&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img alt="LocalStorage" src="https://img.shields.io/badge/存储-LocalStorage-5391FE?style=for-the-badge&logo=localstorage&logoColor=white">
</p>

AI 大模型训练模拟器。从零开始，体验完整的 AI 大模型研发流程：采集数据、购买 GPU、研发技术、训练模型、跑基准测试。

> 这不是经营游戏，这是训练模拟器。核心乐趣在于研究技术路线、优化训练参数、挑战更高基准得分。

---

## 快速开始

用浏览器直接打开 `index.html` 即可，无需安装任何依赖。

如需本地服务器：

```bash
cd model-rush
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> 修改 JS/CSS 后按 `Ctrl+F5` 强制刷新清缓存。

依赖通过 CDN 加载：Three.js（3D 渲染）、Tailwind CSS（界面样式）。

---

## 游戏定位

**Model Rush 是一款训练模拟器**，核心体验在于：

1. **技术路线选择** — 41 项技术按 5 个层级依赖树排列，必须解锁当前层级全部技术才能进入下一级
2. **训练参数调优** — 自由滑动条 1B~3T 参数、可调超参（学习率、Batch Size、序列长度、Warmup）
3. **GPU 选型策略** — 14 款 GPU 型号（A100 到 Vera Rubin），按算力/显存/功耗/价格权衡
4. **三阶段训练** — 预训练(72%) → SFT(20%) → 对齐(8%)，包含子阶段、检查点、训练中事件
5. **基准测试挑战** — 6 大类基准评测（推理/编程/理解/多语言/安全/长上下文），追求最高分

收入与融资只是支撑继续训练的手段，不是游戏目标。真正的目标是训练出最高基准测试得分的模型。

---

## 核心流程

```
采集数据 → 购买GPU → 研发技术 → 训练模型 → 基准测试 → 部署/迭代
```

### 训练系统

- **参数范围**：1B ~ 3000B (3T)，自由滑动条，不限于固定档位
- **训练阶段**：预训练 → 监督微调 SFT → 对齐训练，含子阶段进度
- **超参数**：学习率、Batch Size、序列长度、Warmup 步数均可实时调整
- **检查点**：每 10% 进度自动保存，训练崩坏后可回滚
- **暂停/恢复**：训练可随时暂停，暂停超过 30 天损失 1% 质量
- **并行训练**：支持同时运行多个训练任务，GPU 资源自动分配
- **训练中事件**：Loss Spike、GPU 离线、数据瓶颈、梯度消失

### 技术研发树（5 层，41 项技术）

必须解锁当前层级全部技术才能研发下一级技术：

| 层级 | 名称 | 技术数 | 说明 |
|------|------|--------|------|
| Tier 1 | 探索级 | 8 | Flash Attention、Mixed Precision、RoPE、数据去重、课程学习等 |
| Tier 2 | 工程级 | 9 | GQA、ZeRO-3、Ring Attention、LoRA、知识蒸馏、RLAIF 等 |
| Tier 3 | 架构级 | 7 | MoE、MTP、3D 并行、GRPO、Constitutional AI、QAT 等 |
| Tier 4 | 前沿级 | 14 | FP8 训练、FSDP2、合成课程、连续批处理、工具调用训练等 |
| Tier 5 | 突破级 | 5 | 液冷超算、神经形态计算、量子机器学习、AGI 对齐、自改进训练 |

### GPU 型号（14 款）

| GPU | 架构 | TFLOPS | 显存 | 功耗 | 单价 | 解锁市值 |
|-----|------|--------|------|------|------|---------|
| A100 80GB | Ampere | 312 | 80GB HBM2e | 400W | $15K | $0 |
| L40S | Ada | 733 | 48GB GDDR6 | 350W | $12K | $150M |
| H100 | Hopper | 1979 | 80GB HBM3 | 700W | $30K | $200M |
| H800 | Hopper | 1979 | 80GB HBM3 | 700W | $35K | $300M |
| MI300X | CDNA3 | 1307 | 192GB HBM3 | 750W | $20K | $300M |
| H200 | Hopper | 1979 | 141GB HBM3e | 700W | $45K | $500M |
| Gaudi 3 | Gaudi | 1835 | 128GB HBM2e | 900W | $35K | $600M |
| MI325X | CDNA3 | 1307 | 256GB HBM3e | 1000W | $28K | $800M |
| B200 | Blackwell | 2250 | 192GB HBM3e | 1000W | $55K | $1B |
| B300 | Blackwell Ultra | 4500 | 288GB HBM3e | 1400W | $70K | $2B |
| MI355X | CDNA4 | 2500 | 288GB HBM3e | 1400W | $60K | $3B |
| GB300 NVL72 | Blackwell Ultra | 4500 | 288GB HBM3e | 1800W | $90K | $5B |
| Rubin | Rubin | 6250 | 288GB HBM4 | 1800W | $100K | $10B |
| Vera Rubin | Vera | 15000 | 512GB HBM4 | 2500W | $180K | $25B |

### 数据采集

6 种数据源（网页、书籍、代码、学术、合成、多语言），数据质量直接影响模型评分。

### 基准测试

6 大类评测：推理(25%)、编程(20%)、文本理解(20%)、多语言(15%)、安全性(10%)、长上下文(10%)。

评分受多因素影响：模型规模、数据质量、技术加成、超参数、对齐方法、训练稳定性。

### 数据中心

- 每层 400 个机架位（20×20）
- 加盖楼层扩展容量，费用逐层递增
- 3D 场景可视化：供电房、冷却塔、管道连接、多层机房

---

## 时间系统

- 1 真实秒 = 1 游戏天（1x 速度）
- 支持 1x / 2x / 4x 速度，可暂停
- 自动存档每 100 秒

---

## 3D 场景操作

- 旋转：鼠标拖拽（移动端单指）
- 缩放：滚轮（移动端双指）
- 点击 GPU 机架：查看详情
- 点击供电房/冷却塔：查看容量状态

---

## 界面

- **预览**：运营概览、财务、基础设施
- **产品**：已部署模型列表、部署与调配 GPU
- **训练**：训练进度、阶段/子阶段、Loss、检查点
- **研发**：技术树、层级进度、研发队列
- **库存**：GPU 库存明细
- **日志**：事件日志

---

## 技术栈

- HTML5 + CSS3 + JavaScript (ES6+)
- Three.js 0.148（3D 渲染）
- Tailwind CSS 3.x（界面样式）
- 纯前端，单存档（LocalStorage）

---

## 文件结构

```
model-rush/
├── index.html
├── README.md
├── assets/
│   └── favicon.ico
├── css/
│   └── style.css
└── js/
    ├── config.js           # 配置常量（14 款 GPU、41 项技术、5 层技术树）
    ├── game.js             # 游戏状态与时间循环
    ├── economy.js          # 经济系统
    ├── training.js         # 训练系统
    ├── benchmark.js        # 基准测试评估
    ├── research.js         # 技术研发系统
    ├── data.js             # 数据采集系统
    ├── events.js           # 随机事件
    ├── save.js             # 单存档系统
    ├── scene.js            # Three.js 场景
    ├── datacenter.js       # 3D 多层数据中心
    ├── ui.js               # UI 交互
    └── main.js             # 主入口
```

---

## 研究员系统

研究员可加速研发和训练，解锁需要达到对应市值：

| 级别 | 月薪 | 加速效果 | 解锁市值 |
|------|------|---------|---------|
| 初级研究员 | $3M | +2% | $100M |
| 高级研究员 | $8M | +4% | $500M |
| 首席研究员 | $15M | +6% | $5B |

每级最多聘请 5 人，聘请冷却 30 天。

---

## 基准测试算法

基准测试得分由以下因素综合决定：

- **模型规模**：参数越多基础分越高（对数增长）
- **数据质量**：采集高质量数据提升通用质量加成（上限 1.35x）
- **技术加成**：41 项技术提供分类加成（如 Flash Attention 提升编程能力）
- **超参数**：学习率、Batch Size、序列长度影响训练效果
- **对齐方法**：RLHF/DPO 提供质量加成
- **训练稳定性**：中断次数、Loss Spike 等事件会降低得分
- **难度系数**：整体分数乘以 0.75 的难度系数，避免轻易满分

评分公式：
```
基础分 = 15 + max(0, log10(params) - 9) × 3.5
分类得分 = 基础分 × 通用质量 × 数据分布加成(±8%) × 技术加成(×0.7) × 中断惩罚(×0.92) × 随机波动(0.92~1.08) × 难度系数(0.75)
最终得分 = Σ(分类得分 × 权重)
```

---

## 版权信息

**作者**：mukunjin  
**仓库**：https://github.com/mukunjin/model-rush

所有源文件顶部均包含版权声明：
```
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
```