// Model Rush - Benchmark 评分系统
const Benchmark = {
  // 技术对特定基准类别的影响（小幅加成，不让分数膨胀）
  CATEGORY_TECH_BONUSES: {
    moe:             { reasoning: 0.05, coding: 0.05 },
    distillation:    { comprehension: 0.05 },
    constitutional:  { safety: 0.10 },
    gqa:             { long_context: 0.05 },
    mtp:             { reasoning: 0.03, multilingual: 0.03 },
    qat:             { reasoning: 0.03, coding: 0.03, comprehension: 0.03, multilingual: 0.03, safety: 0.03, long_context: 0.03 },
    sparse_attention:{ comprehension: -0.03 },
    swiglu:          { reasoning: 0.02, coding: 0.02, comprehension: 0.02 },
    grpo:            { reasoning: 0.05, coding: 0.03 },
    kv_cache:        { long_context: 0.03 },
    rope:            { long_context: 0.04, multilingual: 0.02 },
    ring_attention:  { long_context: 0.05 },
    rlaif:           { safety: 0.04 },
    data_dedup:      { comprehension: 0.02, multilingual: 0.02 },
    tokenizer_opt:   { comprehension: 0.03, multilingual: 0.05 },
    synthetic_curriculum: { reasoning: 0.06, coding: 0.02 },
    fsdp2:           { reasoning: 0.01, coding: 0.01 },
    retrieval_pretraining: { reasoning: 0.04, comprehension: 0.05 },
    context_compression: { long_context: 0.07, comprehension: 0.02 },
    preference_optimization: { reasoning: 0.04, safety: 0.06 },
    tool_use_training: { reasoning: 0.06, coding: 0.07 },
    privacy_preserving_data: { safety: 0.05 }
  },

  evaluate(training) {
    // 兼容旧存档：如果没有 params，从 scale 查找
    const params = training.params || (CONFIG.MODEL_SCALES[training.scale] ? CONFIG.MODEL_SCALES[training.scale].params : 70e9);
    const logParams = Math.log10(params);

    // 通用质量加成（来自数据采集质量、技术和对齐方法，上限1.30）
    let generalQuality = 1.0 + (training.dataQualityScoreMod || 0);
    for (const techKey of (training.selectedTechs || [])) {
      const tech = CONFIG.TECH_RESEARCH[techKey];
      if (tech && tech.qualityMod) {
        generalQuality += tech.qualityMod;
      }
    }
    if (training.alignmentMethod === 'rlhf') {
      generalQuality += CONFIG.ALIGNMENT_METHODS.rlhf.qualityBonus;
    } else if (training.alignmentMethod === 'dpo') {
      generalQuality += CONFIG.ALIGNMENT_METHODS.dpo.qualityBonus;
    }
    generalQuality = Math.min(generalQuality, 1.30);

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
      // 基础分（每个类别）：模型越大基础分越高，但增长放缓
      let catScore = 20 + Math.max(0, logParams - 9) * 7;

      // 应用通用质量加成
      catScore *= generalQuality;

      // 数据类别分布加成：某类数据占比越高，对应类别得分越高（钳制±10%）
      if (dataTotal > 0) {
        const share = (dataDist[key] || 0) / dataTotal;
        const bonusFactor = 1 + (share - uniformShare) * 0.6;
        catScore *= Math.max(0.9, Math.min(1.10, bonusFactor));
      }

      // 应用特定类别技术加成
      let catTechBonus = 1.0;
      for (const techKey of (training.selectedTechs || [])) {
        const bonusMap = this.CATEGORY_TECH_BONUSES[techKey];
        if (bonusMap && bonusMap[key]) {
          catTechBonus += bonusMap[key];
        }
      }
      catScore *= catTechBonus;

      // 中断惩罚
      catScore *= (1 - (training.interruptions || 0) * 0.05);

      // 随机波动（每个类别独立）
      catScore *= (0.95 + Math.random() * 0.10);

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
