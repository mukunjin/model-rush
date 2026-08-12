// Model Rush - Benchmark 评分系统
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const Benchmark = {
  // 技术对特定基准类别的影响（小幅加成，不让分数膨胀）
  CATEGORY_TECH_BONUSES: {
    // Tier 1 基础技术
    flash_attention: { reasoning: 0.03, coding: 0.03 },
    mixed_precision: { reasoning: 0.02, coding: 0.02, comprehension: 0.02 },
    rope:            { long_context: 0.04, multilingual: 0.02 },
    data_dedup:      { comprehension: 0.02, multilingual: 0.02 },
    curriculum:      { reasoning: 0.03, comprehension: 0.02 },
    seq_packing:     { coding: 0.02, comprehension: 0.02 },
    swiglu:          { reasoning: 0.02, coding: 0.02, comprehension: 0.02 },
    rmsnorm:         { reasoning: 0.01, coding: 0.01 },
    // Tier 2 进阶技术
    gqa:             { long_context: 0.05 },
    zero3:           { reasoning: 0.02, coding: 0.02 },
    ring_attention:  { long_context: 0.05 },
    sparse_attention:{ comprehension: -0.03 },
    lora:            { coding: 0.03, comprehension: 0.02 },
    distillation:    { comprehension: 0.05 },
    rlaif:           { safety: 0.04 },
    grad_checkpoint: { coding: 0.01 },
    kv_cache:        { long_context: 0.03 },
    // Tier 3 高级技术
    moe:             { reasoning: 0.05, coding: 0.05 },
    mtp:             { reasoning: 0.03, multilingual: 0.03 },
    parallel3d:      { reasoning: 0.03, coding: 0.03 },
    grpo:            { reasoning: 0.05, coding: 0.03 },
    constitutional:  { safety: 0.10 },
    qat:             { reasoning: 0.03, coding: 0.03, comprehension: 0.03, multilingual: 0.03, safety: 0.03, long_context: 0.03 },
    speculative:     { coding: 0.02 },
    // Tier 4 前沿技术
    fp8_training:    { reasoning: 0.02, coding: 0.02 },
    fsdp2:           { reasoning: 0.01, coding: 0.01 },
    tokenizer_opt:   { comprehension: 0.03, multilingual: 0.05 },
    synthetic_curriculum: { reasoning: 0.06, coding: 0.02 },
    continuous_batching: { coding: 0.02 },
    open_source_ecosystem: { comprehension: 0.02 },
    expert_parallel: { reasoning: 0.03, coding: 0.03 },
    kernel_fusion:   { coding: 0.02 },
    retrieval_pretraining: { reasoning: 0.04, comprehension: 0.05 },
    context_compression: { long_context: 0.07, comprehension: 0.02 },
    preference_optimization: { reasoning: 0.04, safety: 0.06 },
    tool_use_training: { reasoning: 0.06, coding: 0.07 },
    smooth_quantization: { coding: 0.01 },
    privacy_preserving_data: { safety: 0.05 },
    // Tier 5 突破性技术
    liquid_cooling:  { reasoning: 0.02, coding: 0.02 },
    neuromorphic:    { reasoning: 0.04, coding: 0.03, comprehension: 0.03 },
    quantum_ml:      { reasoning: 0.08, coding: 0.05 },
    agi_alignment:   { safety: 0.12, comprehension: 0.03 },
    self_improving:  { reasoning: 0.06, coding: 0.06, comprehension: 0.06, multilingual: 0.06, safety: 0.06, long_context: 0.06 }
  },

  evaluate(training) {
    // 兼容旧存档：如果没有 params，从 scale 查找
    const params = training.params || (CONFIG.MODEL_SCALES[training.scale] ? CONFIG.MODEL_SCALES[training.scale].params : 70e9);
    const logParams = Math.log10(params);

    // 难度系数：整体降低分数，避免轻易满分
    const DIFFICULTY_MULTIPLIER = 0.75;

    // 通用质量加成（来自数据采集质量、技术和对齐方法，上限降低到 1.35）
    let generalQuality = 1.0 + (training.dataQualityScoreMod || 0);
    for (const techKey of (training.selectedTechs || [])) {
      const tech = CONFIG.TECH_RESEARCH[techKey];
      if (tech && tech.qualityMod) {
        generalQuality += tech.qualityMod * Research.getTechLevel(techKey);
      }
    }
    if (training.alignmentMethod === 'rlhf') {
      generalQuality += CONFIG.ALIGNMENT_METHODS.rlhf.qualityBonus;
    } else if (training.alignmentMethod === 'dpo') {
      generalQuality += CONFIG.ALIGNMENT_METHODS.dpo.qualityBonus;
    }
    generalQuality = Math.min(generalQuality, 1.35);

    const breakdown = {};
    const benchmarks = CONFIG.BENCHMARKS;

    // 数据类别分布影响对应基准类别（来源多样化的奖励）
    let dataDist = {};
    try {
      dataDist = DataCollection.getCategoryDistribution();
    } catch (e) { /* 极端情况：无数据时不应用分布加成 */ }
    const dataTotal = Object.values(dataDist).reduce((a, b) => a + b, 0);
    const uniformShare = 1 / Object.keys(benchmarks).length; // 均匀分布基准值

    for (const [key, bm] of Object.entries(benchmarks)) {
      // 基础分：模型越大基础分越高，但增长率降低（从5.5降到3.5）
      let catScore = 15 + Math.max(0, logParams - 9) * 3.5;

      // 应用通用质量加成
      catScore *= generalQuality;

      // 数据类别分布加成：某类数据占比越高，对应类别得分越高（钳制±8%，从10%降低）
      if (dataTotal > 0) {
        const share = (dataDist[key] || 0) / dataTotal;
        const bonusFactor = 1 + (share - uniformShare) * 0.5;
        catScore *= Math.max(0.92, Math.min(1.08, bonusFactor));
      }

      // 应用特定类别技术加成（效果降低30%）
      let catTechBonus = 1.0;
      for (const techKey of (training.selectedTechs || [])) {
        const bonusMap = this.CATEGORY_TECH_BONUSES[techKey];
        if (bonusMap && bonusMap[key]) {
          catTechBonus += bonusMap[key] * Research.getTechLevel(techKey) * 0.7;
        }
      }
      catScore *= catTechBonus;

      // 中断惩罚（从5%增加到8%）
      catScore *= (1 - (training.interruptions || 0) * 0.08);

      // 随机波动（每个类别独立，范围从±5%扩大到±8%）
      catScore *= (0.92 + Math.random() * 0.16);

      // 应用难度系数
      catScore *= DIFFICULTY_MULTIPLIER;

      // 上限
      catScore = Math.max(0, Math.min(100, catScore));

      breakdown[key] = catScore;
    }

    // 加权总分
    let overallScore = 0;
    for (const [key, bm] of Object.entries(benchmarks)) {
      overallScore += breakdown[key] * bm.weight;
    }
    overallScore = Math.max(0, Math.min(100, overallScore));

    return { overallScore, breakdown };
  }
};