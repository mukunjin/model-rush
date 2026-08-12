// Model Rush - 游戏配置常量
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const CONFIG = {
  // 初始资金（大幅降低，从零开始）
  INITIAL_CASH: 150_000_000, // 1.5亿美金

  // 电价 ($/kWh)
  ELECTRICITY_PRICE: 0.08,
  // 网络接入与带宽费用（每日）；每个已部署模型同价，不随模型规模或 GPU 数量变化。
  NETWORK_DAILY_COST_PER_DEPLOYED_MODEL: 50_000,

  // 供电
  INITIAL_POWER_CAPACITY_MW: 1,
  POWER_EXPAND_BASE_COST_PER_MW: 50_000_000,
  POWER_EXPAND_EXPONENT: 1.3,
  COOLING_RATIO: 0.30,
  INITIAL_COOLING_CAPACITY_MW: 1.5,
  COOLING_EXPAND_BASE_COST_PER_MW: 20_000_000,
  COOLING_EXPAND_EXPONENT: 1.25,

  // 数据中心扩容：往上加一层，每层固定 400 个机架位，成本逐层递增。
  DATACENTER_EXPAND_BASE_COST: 75_000_000,
  DATACENTER_EXPAND_EXPONENT: 1.25,
  DATACENTER_SLOTS_PER_FLOOR: 400,
  DATACENTER_FLOOR_ROWS: 20,
  DATACENTER_FLOOR_COLS: 20,
  GPU_MAX_PER_TYPE: 2000,

  // 员工薪资（每月）
  BASE_SALARY: 5_000_000,
  SALARY_PER_GPU: 500,
  BASE_RENT: 2_000_000,

  // GPU 型号（算力为FP16/BF16 Tensor Core密集性能，单位TFLOPS）
  GPUS: {
    A100:   { name: 'A100 80GB', arch: 'Ampere', tflops: 312, vram: 80, vram_type: 'HBM2e', bw: 2.0, power: 400, price: 15000, color: 0x7f8c8d, unlockValuation: 0 },
    H100:   { name: 'H100', arch: 'Hopper', tflops: 1979, vram: 80, vram_type: 'HBM3', bw: 3.35, power: 700, price: 30000, color: 0x00cc66, unlockValuation: 200_000_000 },
    H800:   { name: 'H800', arch: 'Hopper', tflops: 1979, vram: 80, vram_type: 'HBM3', bw: 2.0, power: 700, price: 35000, color: 0x00aa55, unlockValuation: 300_000_000 },
    MI300X: { name: 'MI300X', arch: 'CDNA3', tflops: 1307, vram: 192, vram_type: 'HBM3', bw: 5.3, power: 750, price: 20000, color: 0xce3b3b, unlockValuation: 300_000_000 },
    L40S:   { name: 'L40S', arch: 'Ada Lovelace', tflops: 733, vram: 48, vram_type: 'GDDR6', bw: 0.86, power: 350, price: 12000, color: 0x4488cc, unlockValuation: 150_000_000 },
    H200:   { name: 'H200', arch: 'Hopper', tflops: 1979, vram: 141, vram_type: 'HBM3e', bw: 4.8, power: 700, price: 45000, color: 0xe6a817, unlockValuation: 500_000_000 },
    MI325X: { name: 'MI325X', arch: 'CDNA3', tflops: 1307, vram: 256, vram_type: 'HBM3e', bw: 6.0, power: 1000, price: 28000, color: 0xd32f2f, unlockValuation: 800_000_000 },
    Gaudi3: { name: 'Gaudi 3', arch: 'Gaudi', tflops: 1835, vram: 128, vram_type: 'HBM2e', bw: 3.7, power: 900, price: 35000, color: 0x9966ff, unlockValuation: 600_000_000 },
    B200:   { name: 'B200', arch: 'Blackwell', tflops: 2250, vram: 192, vram_type: 'HBM3e', bw: 8.0, power: 1000, price: 55000, color: 0xe74c3c, unlockValuation: 1_000_000_000 },
    B300:   { name: 'B300', arch: 'Blackwell Ultra', tflops: 4500, vram: 288, vram_type: 'HBM3e', bw: 8.0, power: 1400, price: 70000, color: 0xff5722, unlockValuation: 2_000_000_000 },
    MI355X: { name: 'MI355X', arch: 'CDNA4', tflops: 2500, vram: 288, vram_type: 'HBM3e', bw: 8.0, power: 1400, price: 60000, color: 0xb71c1c, unlockValuation: 3_000_000_000 },
    GB300:  { name: 'GB300 NVL72', arch: 'Blackwell Ultra', tflops: 4500, vram: 288, vram_type: 'HBM3e', bw: 8.0, power: 1800, price: 90000, color: 0xff6d00, unlockValuation: 5_000_000_000 },
    Rubin:  { name: 'Rubin', arch: 'Rubin', tflops: 6250, vram: 288, vram_type: 'HBM4', bw: 22.0, power: 1800, price: 100000, color: 0xffeaa7, unlockValuation: 10_000_000_000 },
    Vera:   { name: 'Vera Rubin', arch: 'Vera', tflops: 15000, vram: 512, vram_type: 'HBM4', bw: 30.0, power: 2500, price: 180000, color: 0xffffff, unlockValuation: 25_000_000_000 }
  },

  BASE_EFFICIENCY: 0.35,
  SECONDS_PER_DAY: 86400,

  // 模型规模
  MODEL_SCALES: {
    small:  { name: '小型', params: 1e9, tokens: 200e9, label: '1B', inferenceGPUs: 2 },
    medium: { name: '中型', params: 70e9, tokens: 2e12, label: '70B', inferenceGPUs: 16 },
    large:  { name: '大型', params: 400e9, tokens: 10e12, label: '400B', inferenceGPUs: 64 },
    frontier:{ name: '前沿', params: 1e12, tokens: 20e12, label: '1T+', inferenceGPUs: 160 }
  },

  // 推理GPU功耗系数（相对额定功耗）
  INFERENCE_POWER_RATIO: 0.60,

  // 参数范围（自由滑动条）
  PARAMS_MIN_B: 1,     // 最小 1B
  PARAMS_MAX_B: 3000,  // 最大 3000B (3T)
  CHINCHILLA_RATIO: 20, // 训练tokens = params * 20

  // 数据质量
  DATA_QUALITY: {
    low:    { name: '低质量', cost: 0, scoreMod: -0.20 },
    medium: { name: '中等质量', cost: 10_000_000, scoreMod: 0 },
    high:   { name: '高质量', cost: 100_000_000, scoreMod: 0.08 },
    extreme:{ name: '极高质量', cost: 500_000_000, scoreMod: 0.15 }
  },

  // 训练阶段（含子阶段）
  TRAINING_PHASES: {
    pretraining: { name: '预训练', timeRatio: 0.72, subPhases: [
      { name: '数据准备', pct: 0.05 },
      { name: '小规模验证', pct: 0.08 },
      { name: '全量训练', pct: 0.82 },
      { name: '收敛判断', pct: 0.05 }
    ]},
    sft: { name: '监督微调 SFT', timeRatio: 0.20, subPhases: [
      { name: '指令数据筛选', pct: 0.25 },
      { name: '多轮训练', pct: 0.75 }
    ]},
    alignment: { name: '对齐训练', timeRatio: 0.08, subPhases: [
      { name: '偏好对齐', pct: 0.70 },
      { name: '安全评估', pct: 0.30 }
    ]}
  },

  // 对齐方法
  ALIGNMENT_METHODS: {
    rlhf: { name: 'RLHF + PPO', timeRatio: 0.04, qualityBonus: 0.03, cost: 50_000_000 },
    dpo:  { name: 'DPO', timeRatio: 0.01, qualityBonus: 0.01, cost: 10_000_000 }
  },

  // 训练超参数（默认值 + 范围）
  HYPERPARAMS: {
    learningRate: { label: '学习率', default: 2e-4, min: 1e-6, max: 1e-2, step: 1e-5 },
    batchSize:    { label: 'Batch Size', default: 512, min: 32, max: 4096, step: 32 },
    seqLength:    { label: '序列长度', default: 4096, min: 2048, max: 131072, step: 2048 },
    warmupSteps:  { label: 'Warmup步数', default: 1000, min: 100, max: 10000, step: 100 }
  },

  // 技术研发树（按依赖关系分层，覆盖训练全流程）
  // 研发等级：必须把当前层级所有技术全部解锁，才能进入下一级。
  RESEARCH_LEVELS: {
    1: { name: '探索级', desc: '可研发基础技术' },
    2: { name: '工程级', desc: '可研发进阶技术（需解锁全部基础技术）' },
    3: { name: '架构级', desc: '可研发高级技术（需解锁全部进阶技术）' },
    4: { name: '前沿级', desc: '可研发前沿技术（需解锁全部高级技术）' },
    5: { name: '突破级', desc: '可研发突破性技术（需解锁全部前沿技术）' }
  },
  TECH_UPGRADE_MAX_LEVEL: 3,
  TECH_UPGRADE_COST_MULTIPLIER: 1.75,
  TECH_UPGRADE_DAYS_MULTIPLIER: 1.35,
  TECH_RESEARCH: {
    // Tier 1 - 基础技术（无需前置，新手友好）
    flash_attention: { name: 'Flash Attention', desc: '让GPU算得更快，每次只算一小块注意力，省显存', tier: 1, deps: [], days: 30, cost: 5_000_000, effect: '训练效率+20%', effBonus: 0.20 },
    mixed_precision: { name: 'Mixed Precision', desc: '关键计算用高精度，其余用半精度，速度翻倍', tier: 1, deps: [], days: 30, cost: 5_000_000, effect: '训练效率+15%', effBonus: 0.15 },
    rope:            { name: 'RoPE 位置编码', desc: '让模型理解词语位置关系，支持更长的输入', tier: 1, deps: [], days: 25, cost: 3_000_000, effect: '训练效率+5%，长上下文+10%', effBonus: 0.05 },
    data_dedup:      { name: '数据去重与清洗', desc: '自动删除重复和低质量数据，训练效果更好', tier: 1, deps: [], days: 20, cost: 2_000_000, effect: '数据质量+8%', qualityMod: 0.03 },
    curriculum:      { name: '课程学习', desc: '先学简单内容再学难的，像上课一样循序渐进', tier: 1, deps: [], days: 35, cost: 4_000_000, effect: '训练效率+10%，质量+1%', effBonus: 0.10, qualityMod: 0.01 },
    seq_packing:     { name: '序列打包', desc: '把多个短文拼成一段，不浪费GPU算力', tier: 1, deps: [], days: 15, cost: 2_000_000, effect: '训练效率+15%', effBonus: 0.15 },
    swiglu:          { name: 'SwiGLU 激活函数', desc: '比传统激活函数更平滑，LLaMA/Qwen同款，模型质量更好', tier: 1, deps: [], days: 20, cost: 3_000_000, effect: '质量+2%', qualityMod: 0.02 },
    rmsnorm:         { name: 'RMSNorm', desc: '简化版归一化层，比LayerNorm快15%，现代大模型标配', tier: 1, deps: [], days: 20, cost: 3_000_000, effect: '训练效率+8%', effBonus: 0.08 },
    // Tier 2 - 进阶技术
    gqa:             { name: 'GQA 分组查询', desc: '让多个注意力头共享内存，推理时省显存', tier: 2, deps: ['flash_attention'], days: 45, cost: 8_000_000, effect: '训练效率+10%，推理加速', effBonus: 0.10 },
    zero3:           { name: 'ZeRO-3 分布式训练', desc: '把训练数据分散存到所有GPU上，每张GPU只存一部分，省显存', tier: 2, deps: ['mixed_precision'], days: 45, cost: 10_000_000, effect: '训练效率+10%', effBonus: 0.10 },
    ring_attention:  { name: 'Ring Attention', desc: 'GPU围成一圈轮流计算注意力，能处理超长文本', tier: 2, deps: ['flash_attention'], days: 50, cost: 10_000_000, effect: '长上下文训练+40%', effBonus: 0.08 },
    sparse_attention:{ name: 'Sparse Attention', desc: '只算重要的token，跳过大段无关内容', tier: 2, deps: ['flash_attention'], days: 40, cost: 8_000_000, effect: '训练效率+50%，质量-1%', effBonus: 0.50, qualityMod: -0.01 },
    lora:            { name: 'LoRA 微调', desc: '只训练模型的一小部分参数，大幅节省资源', tier: 2, deps: [], days: 30, cost: 5_000_000, effect: '微调效率+80%，显存节省90%', effBonus: 0.15 },
    distillation:    { name: '知识蒸馏', desc: '让大模型把自己的知识"教"给小模型', tier: 2, deps: [], days: 50, cost: 12_000_000, effect: '质量+3%', qualityMod: 0.03 },
    rlaif:           { name: 'RLAIF 自动反馈', desc: '用AI自动打分代替人工标注，省人力成本', tier: 2, deps: ['distillation'], days: 40, cost: 8_000_000, effect: '对齐质量+3%', qualityMod: 0.02 },
    grad_checkpoint: { name: '梯度检查点', desc: '训练时不存所有中间结果，用到时重新算，省显存换时间', tier: 2, deps: ['mixed_precision'], days: 25, cost: 4_000_000, effect: '显存节省60%，速度降低20%', effBonus: 0.05 },
    kv_cache:        { name: 'KV Cache 优化', desc: '缓存已计算的键值对，推理时不用重复算，速度翻倍', tier: 2, deps: ['gqa'], days: 30, cost: 6_000_000, effect: '推理速度+80%', incomeBonus: 0.20 },
    // Tier 3 - 高级技术
    moe:             { name: 'MoE 混合专家', desc: '把模型拆成多个"专家"，每次只激活需要的部分', tier: 3, deps: ['parallel3d'], days: 90, cost: 50_000_000, effect: '训练效率+30%，质量+2%', effBonus: 0.30, qualityMod: 0.02 },
    mtp:             { name: '多Token预测', desc: '一次预测多个词，让模型学得更快更准', tier: 3, deps: ['gqa'], days: 60, cost: 20_000_000, effect: '训练效率+25%，质量+1%', effBonus: 0.25, qualityMod: 0.01 },
    parallel3d:      { name: '3D 并行训练', desc: '同时用三种并行策略，支持超大规模训练', tier: 3, deps: ['zero3'], days: 60, cost: 15_000_000, effect: '训练效率+10%', effBonus: 0.10 },
    grpo:            { name: 'GRPO 强化学习', desc: 'DeepSeek R1同款算法，让模型学会推理', tier: 3, deps: ['rlaif'], days: 70, cost: 30_000_000, effect: '推理能力+15%，质量+3%', effBonus: 0.10, qualityMod: 0.03 },
    constitutional:  { name: 'Constitutional AI', desc: '用规则约束模型行为，让它更安全', tier: 3, deps: ['distillation'], days: 40, cost: 8_000_000, effect: '安全性+10%', qualityMod: 0.01 },
    qat:             { name: '量化感知训练', desc: '训练时模拟低精度，推理时速度更快', tier: 3, deps: ['mixed_precision'], days: 50, cost: 10_000_000, effect: '推理效率+50%，质量+1%', qualityMod: 0.01 },
    speculative:     { name: '推测解码', desc: '小模型快速生成草稿，大模型验证，API收入翻倍', tier: 3, deps: ['distillation'], days: 60, cost: 15_000_000, effect: '推理速度+100%，API收入+50%', incomeBonus: 0.50 }
    ,
    // Tier 4 - 前沿技术
    fp8_training:    { name: 'FP8 训练', desc: '用更低精度完成大部分计算，在控制误差的同时提升吞吐', tier: 4, deps: ['mixed_precision', 'parallel3d'], days: 75, cost: 35_000_000, effect: '训练效率+22%', effBonus: 0.22 },
    fsdp2:            { name: 'FSDP2 分片并行', desc: '更细粒度地切分参数、梯度与优化器状态，扩大可训练模型规模', tier: 4, deps: ['zero3', 'grad_checkpoint'], days: 80, cost: 40_000_000, effect: '训练效率+18%，质量+1%', effBonus: 0.18, qualityMod: 0.01 },
    tokenizer_opt:    { name: '领域 Tokenizer', desc: '针对训练语料重建分词器，减少碎片词并提升多语言表达', tier: 4, deps: ['rope', 'data_dedup'], days: 55, cost: 25_000_000, effect: '多语言与理解质量+3%', qualityMod: 0.02 },
    synthetic_curriculum: { name: '合成课程数据', desc: '用自动验证的合成题目构建由浅入深的推理训练集', tier: 4, deps: ['curriculum', 'rlaif'], days: 85, cost: 45_000_000, effect: '推理质量+4%', qualityMod: 0.03 },
    continuous_batching: { name: '连续批处理', desc: '动态合并不同请求，减少推理GPU等待时间', tier: 4, deps: ['kv_cache', 'speculative'], days: 65, cost: 30_000_000, effect: '推理收入+30%', incomeBonus: 0.30 },
    open_source_ecosystem: { name: '开源生态运营', desc: '建立托管、插件与企业支持渠道，让开源模型也能持续变现', tier: 4, deps: ['distillation', 'constitutional'], days: 70, cost: 32_000_000, effect: '开源模型收入+50%', openSourceIncomeBonus: 0.50 },
    expert_parallel: { name: '专家并行', desc: '将不同 MoE 专家分布到多组 GPU，同步执行以缩短训练瓶颈', tier: 4, deps: ['moe', 'parallel3d'], days: 95, cost: 55_000_000, effect: '训练效率+28%', effBonus: 0.28 },
    kernel_fusion: { name: '算子融合编译', desc: '将连续的小算子编译为单个 GPU 内核，减少显存读写与调度开销', tier: 4, deps: ['fp8_training', 'flash_attention'], days: 75, cost: 38_000_000, effect: '训练效率+16%', effBonus: 0.16 },
    retrieval_pretraining: { name: '检索增强预训练', desc: '训练模型主动检索可信资料并利用证据作答，提高知识密度', tier: 4, deps: ['data_dedup', 'tokenizer_opt'], days: 80, cost: 42_000_000, effect: '理解与推理质量+3%', qualityMod: 0.03 },
    context_compression: { name: '上下文压缩', desc: '把冗长历史压缩为高信息密度记忆，在长上下文中保持关键线索', tier: 4, deps: ['ring_attention', 'gqa'], days: 70, cost: 34_000_000, effect: '长上下文质量+4%，训练效率+8%', qualityMod: 0.01, effBonus: 0.08 },
    preference_optimization: { name: '偏好优化管线', desc: '自动清洗偏好对、难例挖掘并迭代对齐策略，提高可靠性', tier: 4, deps: ['grpo', 'constitutional'], days: 85, cost: 48_000_000, effect: '安全与推理质量+3%', qualityMod: 0.03 },
    tool_use_training: { name: '工具调用训练', desc: '让模型学会规划、调用检索和代码工具，再根据结果修正答案', tier: 4, deps: ['grpo', 'synthetic_curriculum'], days: 90, cost: 52_000_000, effect: '编程与推理质量+4%', qualityMod: 0.03 },
    smooth_quantization: { name: '平滑量化部署', desc: '在尽量保持精度的前提下压缩权重与激活值，降低推理成本', tier: 4, deps: ['qat', 'continuous_batching'], days: 65, cost: 30_000_000, effect: '推理收入+25%', incomeBonus: 0.25 },
    privacy_preserving_data: { name: '隐私保护数据管线', desc: '在训练前做脱敏、去标识化与风险审计，获得更多可信企业数据', tier: 4, deps: ['data_dedup', 'constitutional'], days: 75, cost: 40_000_000, effect: '数据质量+3%，安全性提升', qualityMod: 0.03 },
    // Tier 5 - 突破性技术
    liquid_cooling: { name: '液冷超算集群', desc: '全浸没式液冷系统，支持超高密度GPU部署，功耗与散热极限提升', tier: 5, deps: ['fp8_training', 'expert_parallel'], days: 120, cost: 80_000_000, effect: '训练效率+15%', effBonus: 0.15 },
    neuromorphic: { name: '神经形态计算', desc: '基于脉冲神经网络的新型计算架构，能效比远超传统GPU', tier: 5, deps: ['kernel_fusion', 'retrieval_pretraining'], days: 150, cost: 120_000_000, effect: '训练效率+35%，质量+2%', effBonus: 0.35, qualityMod: 0.02 },
    quantum_ml: { name: '量子机器学习', desc: '利用量子计算加速特定矩阵运算，突破经典计算瓶颈', tier: 5, deps: ['moe', 'tool_use_training'], days: 180, cost: 200_000_000, effect: '训练效率+40%，推理质量+3%', effBonus: 0.40, qualityMod: 0.03 },
    agi_alignment: { name: 'AGI 对齐协议', desc: '可验证的安全对齐框架，确保超大规模模型始终可控', tier: 5, deps: ['preference_optimization', 'constitutional'], days: 160, cost: 150_000_000, effect: '安全性+20%，质量+5%', qualityMod: 0.05 },
    self_improving: { name: '自改进训练', desc: '模型在训练过程中自主发现并修复自身弱点，持续提升质量', tier: 5, deps: ['synthetic_curriculum', 'grpo'], days: 200, cost: 250_000_000, effect: '质量+5%，所有基准+3%', qualityMod: 0.05 }
  },

  // 研究员
  RESEARCHER_TIERS: {
    junior:   { name: '初级研究员', baseSalary: 3_000_000, effBonus: 0.02, desc: '刚毕业的AI研究员,基础研究能力', unlockValuation: 100_000_000 },
    senior:   { name: '高级研究员', baseSalary: 8_000_000, effBonus: 0.04, desc: '有经验的算法工程师,产出稳定', unlockValuation: 500_000_000 },
    principal:{ name: '首席研究员', baseSalary: 15_000_000, effBonus: 0.06, desc: '顶尖AI科学家,可能带来算法突破', unlockValuation: 5_000_000_000 }
  },
  RESEARCHER_PRICE_MULTIPLIER: 1.5, // 每次聘请后薪资上涨50%
  RESEARCHER_HIRE_COOLDOWN: 30, // 每次聘请后冷却30天

  // 基准测试评估（6大类）
  BENCHMARKS: {
    reasoning:    { name: '推理能力', weight: 0.25, desc: '数学、逻辑推理、常识问答' },
    coding:       { name: '编程能力', weight: 0.20, desc: '代码生成、调试、算法设计' },
    comprehension:{ name: '文本理解', weight: 0.20, desc: '阅读理解、摘要、信息提取' },
    multilingual: { name: '多语言', weight: 0.15, desc: '中英互译、跨语言任务' },
    safety:       { name: '安全性', weight: 0.10, desc: '红队攻击、有害内容拒答率' },
    long_context: { name: '长上下文', weight: 0.10, desc: '大海捞针、长文档检索' }
  },

  // 收入模型
  API_PRICE_PER_TOKEN: { small: 1e-6, medium: 3e-6, large: 6e-6, frontier: 1e-5 },
  DAILY_ACTIVE_USERS: { small: 20_000_000, medium: 150_000_000, large: 500_000_000, frontier: 2_000_000_000 },
  AVG_DAILY_TOKENS: 5000,
  // 开源模型可通过托管 API、支持服务获得收入，但低于同等闭源模型。
  OPEN_SOURCE_INCOME_MULTIPLIER: 0.35,

  // 融资
  FUNDRAISE_COOLDOWN_DAYS: 180,
  FUNDRAISE_BASE: 1_000_000_000,
  FUNDRAISE_SCORE_MULT: 8, // 融资金额 = 基准 x (模型得分 / 100) x 倍数

  // 企业授权收入（每月）
  ENTERPRISE_BASE: 50_000_000, // 模型得分50时基础月收入

  // 随机事件（训练经营相关）
  EVENTS: [
    { name: '硬件故障', type: 'negative', desc: '部分GPU因过热损坏', effect: 'lose_gpu', value: 0.02 },
    { name: '电网波动', type: 'negative', desc: '供电不稳定', effect: 'blackout', days: 2 },
    { name: '数据泄露', type: 'negative', desc: '用户数据泄露，面临罚款', effect: 'fine', value: 100_000_000 },
    { name: '人才挖角', type: 'negative', desc: '核心研究员被挖走', effect: 'eff_penalty', value: 0.20, days: 15 },
    { name: '技术突破', type: 'positive', desc: '研究团队取得算法突破', effect: 'training_boost', value: 0.20 },
    { name: '政策利好', type: 'positive', desc: '政府发放AI产业补贴', effect: 'subsidy', value: 500_000_000 },
    { name: '芯片禁运', type: 'negative', desc: '出口管制升级，无法购买新GPU', effect: 'buy_ban', days: 30 },
    { name: '行业盛会', type: 'positive', desc: '行业大会展示成果，公司估值上升', effect: 'valuation_boost', value: 0.15 },
    { name: '算法突破', type: 'positive', desc: '发现新的训练范式', effect: 'next_train_boost', value: 0.30 },
    { name: '电力故障', type: 'negative', desc: '供电设施故障，容量临时下降', effect: 'power_fault', value: 0.30, days: 10 }
  ],

  // 训练中突发事件
  TRAINING_EVENTS: [
    { name: 'Loss Spike', desc: '损失函数突然飙升，需要调整学习率', effect: 'loss_spike', penalty: 0.03 },
    { name: 'GPU离线', desc: '某张GPU出现硬件故障，训练效率下降', effect: 'gpu_offline', penalty: 0.08 },
    { name: '数据瓶颈', desc: '存储带宽不足，数据加载变慢', effect: 'io_bottleneck', penalty: 0.05 },
    { name: '梯度消失', desc: '模型深度导致梯度消失，需要调整架构', effect: 'gradient_vanishing', penalty: 0.04 }
  ],

  // 数据采集（从零开始的完整训练流程）
  DATA_SOURCES: {
    web_crawl:   { name: '网页爬取', desc: '互联网公开文本，量大但质量参差不齐', cost: 5_000_000, qualityBase: 0.55, tokens: 500e9, category: '通用' },
    books:       { name: '书籍语料', desc: '高质量出版书籍，文学与知识类', cost: 15_000_000, qualityBase: 0.85, tokens: 100e9, category: '知识' },
    code_repos:  { name: '代码仓库', desc: 'GitHub开源代码，提升编程能力', cost: 20_000_000, qualityBase: 0.80, tokens: 150e9, category: '编程' },
    academic:    { name: '学术论文', desc: 'arXiv等学术论文，提升推理能力', cost: 25_000_000, qualityBase: 0.90, tokens: 30e9, category: '推理' },
    synthetic:   { name: '合成数据', desc: '用现有模型生成高质量训练数据', cost: 30_000_000, qualityBase: 0.75, tokens: 200e9, category: '通用' },
    multilingual:{ name: '多语言语料', desc: '中英日韩等多语言文本', cost: 10_000_000, qualityBase: 0.65, tokens: 300e9, category: '多语言' }
  },

  // 事件触发间隔
  EVENT_MIN_DAYS: 30,
  EVENT_MAX_DAYS: 90,
  TRAINING_EVENT_CHANCE: 0.08 // 训练中每天8%概率触发事件

};

// === 工具函数 ===
// 格式化参数数量为可读字符串
function formatParams(params) {
  if (params >= 1e12) return (params / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  if (params >= 1e9) return Math.round(params / 1e9) + 'B';
  return Math.round(params / 1e6) + 'M';
}

// 根据参数数量映射到规模类别（用于收入计算）
function paramsToScaleKey(params) {
  if (params < 5e9) return 'small';
  if (params < 150e9) return 'medium';
  if (params < 700e9) return 'large';
  return 'frontier';
}

// 根据参数数量计算最少推理GPU数（以H100为基准）
function recommendedInferenceGPUs(params) {
  return Math.max(1, Math.ceil(params / 5e9));
}

// 按型号折算最少推理GPU数（不同型号算力/显存不同，消耗数量不同；以H100为基准）
function recommendedInferenceGPUsForType(params, gpuKey) {
  const gpu = CONFIG.GPUS[gpuKey];
  if (!gpu) return recommendedInferenceGPUs(params);
  const base = recommendedInferenceGPUs(params);
  const baseGPU = CONFIG.GPUS.H100;
  // 按算力折算：低算力型号需要更多张
  const byFlops = Math.max(1, Math.ceil(base * baseGPU.tflops / gpu.tflops));
  // 显存下限：fp16权重需能装入显存
  const weightGB = (params * 2) / 1e9;
  const byVram = Math.max(1, Math.ceil(weightGB / gpu.vram));
  return Math.max(byFlops, byVram);
}

// 将实际部署的GPU（按型号混合）折算为等效H100数量
function effectiveInferenceGPUs(deploymentGPUs) {
  let total = 0;
  const baseTflops = CONFIG.GPUS.H100.tflops;
  for (const [type, count] of Object.entries(deploymentGPUs || {})) {
    // 跳过非型号键（如旧存档迁移的 _legacy 占位）
    const g = CONFIG.GPUS[type];
    if (!g) continue;
    total += count * g.tflops / baseTflops;
  }
  return total;
}

// 单张指定型号 GPU 可替代多少张 H100（用于混合部署的“汇率”）。
function gpuToH100Rate(gpuKey) {
  const gpu = CONFIG.GPUS[gpuKey];
  return gpu ? gpu.tflops / CONFIG.GPUS.H100.tflops : 0;
}
