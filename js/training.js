// Model Rush - 模型训练系统
const Training = {
  // 当前训练任务: { phase, scale, dataQuality, alignmentMethod, selectedTechs, gpuAllocated, totalDays, elapsedDays, phaseElapsedDays, modelName, openSource, hparams, subPhase, subPhaseElapsedDays, checkpoints, trainingEventPenalty, interruptions, collapsed }
  newTraining(config) {
    const s = Game.state;

    // 检查数据采集
    const dataStats = DataCollection.getStats();
    if (dataStats.totalTokens < 10) {
      UI.toast('数据不足! 请先采集至少10B tokens训练数据');
      return false;
    }

    // 使用自由参数
    const params = config.params || 70e9;
    const tokens = params * CONFIG.CHINCHILLA_RATIO;
    const gpuAllocation = config.gpuAllocation || {};
    const gpuCount = Object.values(gpuAllocation).reduce((a, b) => a + b, 0);

    // 验证GPU分配不超过可用量
    const inferenceAlloc = Game.getInferenceGPUAllocation();
    const trainingAlloc = Game.getTrainingGPUAllocation();
    for (const [key, count] of Object.entries(gpuAllocation)) {
      const owned = s.gpuInventory[key] || 0;
      const used = (inferenceAlloc[key] || 0) + (trainingAlloc[key] || 0);
      if (count > owned - used) {
        UI.toast(key + ' 可用数量不足');
        return false;
      }
    }
    if (gpuCount <= 0) {
      UI.toast('请至少分配1张GPU');
      return false;
    }

    // 验证所选技术已解锁
    for (const techKey of (config.selectedTechs || [])) {
      if (!Research.isUnlocked(techKey)) {
        UI.toast('技术未解锁: ' + techKey);
        return false;
      }
    }

    // 计算总训练FLOPs = 6 * params * tokens
    const logFlops = Math.log10(6) + Math.log10(params) + Math.log10(tokens);

    // 计算训练效率
    let efficiency = CONFIG.BASE_EFFICIENCY;
    for (const techKey of (config.selectedTechs || [])) {
      const tech = CONFIG.TECH_RESEARCH[techKey];
      if (tech && tech.effBonus) efficiency += tech.effBonus;
    }
    efficiency *= Game.getEffMultiplier();

    // 消耗 next_train_boost 效果
    Game.state.activeEffects = Game.state.activeEffects.filter(e => e.effect !== 'next_train_boost');

    // 计算分配GPU的总TFLOPS（按实际型号）
    let allocatedTFLOPS = 0;
    for (const [key, count] of Object.entries(gpuAllocation)) {
      const gpu = CONFIG.GPUS[key];
      if (gpu) allocatedTFLOPS += count * gpu.tflops;
    }

    // === 供电与冷却检查（训练启动后GPU从闲置升为满载） ===
    const pendingTraining = { gpuAllocation: gpuAllocation };
    Game.getActiveTrainings().push(pendingTraining); // 临时按全部并行任务计算实际功耗
    Game.syncPrimaryTraining();
    const projectedTotalPower = Game.getTotalPowerMW();
    const projectedCoolingLoad = Game.getGPUActualPowerMW() * CONFIG.COOLING_RATIO;
    s.activeTrainings.pop();
    Game.syncPrimaryTraining();

    if (projectedTotalPower > s.powerCapacityMW) {
      s.blackoutDays = 3;
      Game.addLog('警告: 训练启动后功耗超载! 供电不足，开始断电!');
      UI.toast('功耗超载! 断电3天!');
    }
    if (projectedCoolingLoad > s.coolingCapacityMW) {
      efficiency *= 0.7; // 冷却不足：训练效率降低30%
      Game.addLog('警告: 冷却不足! 训练效率降低30%');
      UI.toast('冷却不足! 训练效率-30%');
    }

    // 训练天数
    const logDays = logFlops - (Math.log10(allocatedTFLOPS) + 12 + Math.log10(efficiency) + Math.log10(CONFIG.SECONDS_PER_DAY));
    const totalDays = Math.max(1, Math.ceil(Math.pow(10, logDays)));

    const pretrainingDays = Math.max(1, Math.ceil(totalDays * CONFIG.TRAINING_PHASES.pretraining.timeRatio));
    const sftDays = Math.max(1, Math.ceil(totalDays * CONFIG.TRAINING_PHASES.sft.timeRatio));
    const alignmentDays = Math.max(1, totalDays - pretrainingDays - sftDays);

    // 扣除训练费用
    let trainingCost = 0;
    const effectiveQuality = DataCollection.getEffectiveQuality();
    const dataQualityScoreMod = (effectiveQuality - 0.5) * 0.4;
    const dataQuality = { name: '采集数据', scoreMod: dataQualityScoreMod, cost: 0 };
    if (config.alignmentMethod === 'rlhf') trainingCost += CONFIG.ALIGNMENT_METHODS.rlhf.cost;
    else if (config.alignmentMethod === 'dpo') trainingCost += CONFIG.ALIGNMENT_METHODS.dpo.cost;
    for (const techKey of (config.selectedTechs || [])) {
      const tech = CONFIG.TECH_RESEARCH[techKey];
      if (tech && tech.cost) trainingCost += tech.cost;
    }

    if (trainingCost > 0 && s.cash < trainingCost) {
      UI.toast('资金不足，无法支付训练费用!');
      return false;
    }
    s.cash -= trainingCost;
    if (trainingCost > 0) {
      Game.addLog('训练费用: $' + Economy.formatMoney(trainingCost));
    }

    // 超参数
    const hparams = {
      learningRate: (config.hparams && config.hparams.learningRate !== undefined) ? config.hparams.learningRate : CONFIG.HYPERPARAMS.learningRate.default,
      batchSize: (config.hparams && config.hparams.batchSize !== undefined) ? config.hparams.batchSize : CONFIG.HYPERPARAMS.batchSize.default,
      seqLength: (config.hparams && config.hparams.seqLength !== undefined) ? config.hparams.seqLength : CONFIG.HYPERPARAMS.seqLength.default,
      warmupSteps: (config.hparams && config.hparams.warmupSteps !== undefined) ? config.hparams.warmupSteps : CONFIG.HYPERPARAMS.warmupSteps.default
    };

    const task = {
      id: 'train_' + s.day + '_' + Date.now(),
      phase: 'pretraining',
      params: params,
      label: formatParams(params),
      dataQuality: dataQuality,
      dataQualityScoreMod: dataQualityScoreMod,
      alignmentMethod: config.alignmentMethod || 'dpo',
      selectedTechs: config.selectedTechs || [],
      gpuAllocation: gpuAllocation,
      gpuAllocated: gpuCount,
      allocatedTFLOPS: allocatedTFLOPS,
      totalDays: totalDays,
      pretrainingDays,
      sftDays,
      alignmentDays,
      elapsedDays: 0,
      phaseElapsedDays: 0,
      modelName: config.modelName || ('Model-' + s.day),
      openSource: config.openSource || false,
      hparams: hparams,
      subPhase: 0,
      subPhaseElapsedDays: 0,
      checkpoints: [],
      trainingEventPenalty: 0,
      interruptions: 0,
      collapsed: false,
      paused: false
    };
    Game.getActiveTrainings().push(task);
    Game.syncPrimaryTraining();

    Game.addLog('开始训练 ' + task.modelName + ' (' + formatParams(params) + '), 预计 ' + totalDays + ' 天');

    // 标记训练中GPU（按型号）
    Datacenter.markTrainingGPUs(Game.getTrainingGPUAllocation());
    UI.update();
    return true;
  },

  advanceTrainingDay() {
    for (const t of [...Game.getActiveTrainings()]) {
      this.advanceTaskDay(t);
    }
  },

  advanceTaskDay(t) {
    if (!t || t.collapsed || t.paused) return;

    if (Game.state.blackoutDays > 0) {
      t.interruptions++;
      if (t.interruptions >= 3) {
        t.collapsed = true;
        Game.addLog('训练崩坏! ' + t.modelName + ' 因多次中断而失败');
        this.clearTraining(t);
        UI.update();
        return;
      }
      return;
    }

    // 训练事件惩罚（减缓当天进度）
    if (t.trainingEventPenalty > 0) {
      t.trainingEventPenalty = Math.max(0, t.trainingEventPenalty - 0.01);
      return; // 事件惩罚导致当天无进展
    }

    t.elapsedDays++;
    t.phaseElapsedDays++;
    t.subPhaseElapsedDays++;

    // 训练中突发事件（8%概率）
    if (Math.random() < CONFIG.TRAINING_EVENT_CHANCE) {
      const event = CONFIG.TRAINING_EVENTS[Math.floor(Math.random() * CONFIG.TRAINING_EVENTS.length)];
      t.trainingEventPenalty += event.penalty;
      Game.addLog('训练事件: ' + event.name + ' - ' + event.desc + ' (训练减速)');
    }

    // 保存检查点（每10%总天数）
    const checkpointInterval = Math.max(1, Math.ceil(t.totalDays * 0.1));
    if (t.elapsedDays > 0 && t.elapsedDays % checkpointInterval === 0) {
      this.saveCheckpoint(t);
    }

    // 子阶段推进
    this.advanceSubPhase(t);

    // 阶段切换
    if (t.phase === 'pretraining' && t.phaseElapsedDays >= t.pretrainingDays) {
      t.phase = 'sft';
      t.phaseElapsedDays = 0;
      t.subPhase = 0;
      t.subPhaseElapsedDays = 0;
      Game.addLog(t.modelName + ' 预训练阶段完成，进入SFT微调');
    } else if (t.phase === 'sft' && t.phaseElapsedDays >= t.sftDays) {
      t.phase = 'alignment';
      t.phaseElapsedDays = 0;
      t.subPhase = 0;
      t.subPhaseElapsedDays = 0;
      Game.addLog(t.modelName + ' SFT微调完成，进入对齐训练');
    } else if (t.phase === 'alignment' && t.phaseElapsedDays >= t.alignmentDays) {
      this.completeTraining(t);
    }
  },

  advanceSubPhase(t) {
    const phaseConfig = CONFIG.TRAINING_PHASES[t.phase];
    if (!phaseConfig || !phaseConfig.subPhases) return;
    const subPhases = phaseConfig.subPhases;
    if (t.subPhase >= subPhases.length) return;

    const currentSub = subPhases[t.subPhase];

    let phaseTotalDays;
    if (t.phase === 'pretraining') phaseTotalDays = t.pretrainingDays;
    else if (t.phase === 'sft') phaseTotalDays = t.sftDays;
    else phaseTotalDays = t.alignmentDays;

    const subPhaseTotalDays = Math.max(1, Math.ceil(phaseTotalDays * currentSub.pct));

    if (t.subPhaseElapsedDays >= subPhaseTotalDays && t.subPhase < subPhases.length - 1) {
      t.subPhase++;
      t.subPhaseElapsedDays = 0;
      Game.addLog(t.modelName + ' 进入子阶段: ' + subPhases[t.subPhase].name);
    }
  },

  saveCheckpoint(t) {
    t = t || Game.state.activeTraining;
    if (!t) return;
    const cp = {
      day: t.elapsedDays,
      phase: t.phase,
      phaseElapsedDays: t.phaseElapsedDays,
      subPhase: t.subPhase,
      subPhaseElapsedDays: t.subPhaseElapsedDays,
      trainingEventPenalty: t.trainingEventPenalty,
      interruptions: t.interruptions
    };
    t.checkpoints.push(cp);
    Game.addLog('检查点已保存 (Day ' + t.elapsedDays + ')');
  },

  rollback() {
    const t = Game.state.activeTraining;
    if (!t) {
      UI.toast('没有进行中的训练任务!');
      return;
    }
    if (t.checkpoints.length === 0) {
      UI.toast('没有可用的检查点!');
      return;
    }
    const cp = t.checkpoints[t.checkpoints.length - 1];
    t.checkpoints.pop();
    t.elapsedDays = cp.day;
    t.phase = cp.phase;
    t.phaseElapsedDays = cp.phaseElapsedDays;
    t.subPhase = cp.subPhase;
    t.subPhaseElapsedDays = cp.subPhaseElapsedDays;
    t.trainingEventPenalty = cp.trainingEventPenalty;
    t.interruptions = cp.interruptions;
    Game.addLog('已回滚到检查点 (Day ' + cp.day + ')');
    UI.toast('已回滚到检查点 (Day ' + cp.day + ')');
    UI.update();
  },

  update(dt) {
    // 由 advanceDay 驱动，这里不需要额外逻辑
  },

  completeTraining(t) {
    if (!t) return;
    Game.addLog(t.modelName + ' 训练完成!');

    const result = Benchmark.evaluate(t);
    const model = {
      name: t.modelName,
      params: t.params,
      label: t.label || formatParams(t.params),
      score: result.overallScore,
      benchmarkBreakdown: result.breakdown,
      openSource: t.openSource,
      techs: t.selectedTechs,
      rank: 0,
      deployed: false, // 待用户选择部署GPU
      deploymentGPUs: null
    };

    Game.state.completedModels.push(model);

    this.clearTraining(t);
    Game.addLog(t.modelName + ' 综合得分: ' + result.overallScore.toFixed(1) + (t.openSource ? ' [开源]' : ' [闭源]'));
    UI.toast(t.modelName + ' 训练完成! 得分: ' + result.overallScore.toFixed(1));

    // 弹出部署选择模态框
    UI.showDeployModelModal(model);
    UI.update();
  },

  clearTraining(task) {
    const s = Game.state;
    const tasks = Game.getActiveTrainings();
    const target = task || s.activeTraining;
    const index = tasks.indexOf(target);
    if (index >= 0) tasks.splice(index, 1);
    Game.syncPrimaryTraining();
    Datacenter.unmarkTrainingGPUs();
    if (tasks.length > 0) Datacenter.markTrainingGPUs(Game.getTrainingGPUAllocation());
  },

  abandonTraining(id) {
    const tasks = Game.getActiveTrainings();
    const t = tasks.find(item => item.id === id) || Game.state.activeTraining;
    if (!t) {
      UI.toast('没有进行中的训练任务!');
      return;
    }
    Game.addLog('放弃训练: ' + t.modelName + ' (已进行 ' + t.elapsedDays + ' 天)');
    this.clearTraining(t);
    UI.toast(t.modelName + ' 训练已放弃');
    UI.update();
  },

  togglePause(id) {
    const t = Game.getActiveTrainings().find(item => item.id === id);
    if (!t) return;
    t.paused = !t.paused;
    Game.addLog((t.paused ? '暂停训练: ' : '恢复训练: ') + t.modelName);
    UI.update();
  },

  getProgress(id) {
    const t = id ? Game.getActiveTrainings().find(item => item.id === id) : Game.state.activeTraining;
    if (!t) return null;

    const phaseConfig = CONFIG.TRAINING_PHASES[t.phase];
    let phaseTotalDays = t.pretrainingDays;
    if (t.phase === 'sft') phaseTotalDays = t.sftDays;
    if (t.phase === 'alignment') phaseTotalDays = t.alignmentDays;

    const overallProgress = Math.min(100, (t.elapsedDays / t.totalDays) * 100);
    const phaseProgress = Math.min(100, (t.phaseElapsedDays / Math.max(1, phaseTotalDays)) * 100);

    // 获取当前子阶段信息
    let subPhaseName = '';
    let subPhaseProgress = 0;
    if (phaseConfig && phaseConfig.subPhases && t.subPhase < phaseConfig.subPhases.length) {
      const currentSub = phaseConfig.subPhases[t.subPhase];
      subPhaseName = currentSub.name;
      const subPhaseTotalDays = Math.max(1, Math.ceil(phaseTotalDays * currentSub.pct));
      subPhaseProgress = Math.min(100, (t.subPhaseElapsedDays / subPhaseTotalDays) * 100);
    }

    // 模拟损失值（随训练进度下降）
    const lossProgress = Math.min(1, overallProgress / 100);
    const loss = 8.0 * Math.exp(-4.0 * lossProgress) + 1.5 + (Math.random() - 0.5) * 0.3;

    // GPU利用率
    const gpuUtilization = Math.min(100, (t.gpuAllocated / Math.max(1, Game.state.gpuTotal)) * 100 * (1 - t.trainingEventPenalty * 5));

    // 训练稳定性（受中断和事件影响）
    const stability = Math.max(0, 100 - t.interruptions * 20 - t.trainingEventPenalty * 200);

    return {
      phase: phaseConfig.name,
      overallProgress,
      phaseProgress,
      elapsedDays: t.elapsedDays,
      totalDays: t.totalDays,
      remainingDays: t.totalDays - t.elapsedDays,
      modelName: t.modelName,
      scale: t.label || formatParams(t.params),
      interruptions: t.interruptions,
      collapsed: t.collapsed,
      subPhase: subPhaseName,
      subPhaseProgress,
      subPhaseIndex: t.subPhase,
      loss,
      gpuUtilization,
      stability,
      trainingEventPenalty: t.trainingEventPenalty,
      hparams: t.hparams,
      checkpoints: t.checkpoints.length
    };
  }
};
