// Model Rush - 游戏状态管理与时间循环
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const Game = {
  state: {
    companyName: '', // 公司名称
    cash: CONFIG.INITIAL_CASH,
    valuation: CONFIG.INITIAL_CASH,
    day: 1,
    speed: 1, // 0=pause, 1=1x, 2=2x, 4=4x
    running: false,
    tutorialPaused: false, // 新手引导期间强制暂停，避免误触速度控制后继续结算
    elapsed: 0, // 当前游戏天内累计真实秒数
    lastFrame: 0,

    // GPU 库存: { A100: 0, H100: 0, ... }
    gpuInventory: {},
    gpuTotal: 0,

    // 供电
    powerCapacityMW: CONFIG.INITIAL_POWER_CAPACITY_MW,
    coolingCapacityMW: CONFIG.INITIAL_COOLING_CAPACITY_MW,

    // 训练
    activeTraining: null, // 兼容旧界面：当前首个训练任务
    activeTrainings: [], // 并行训练任务
    deployedModels: [], // 已部署模型 [{name, score, rank, openSource, scale, ...}]
    completedModels: [], // 已完成的模型列表

    // 经济
    dailyIncome: 0,
    dailyExpense: 0,
    lastMonthlyDay: 1,
    lastFundraiseDay: -CONFIG.FUNDRAISE_COOLDOWN_DAYS,

    // 事件


    nextEventDay: 0,
    activeEffects: [], // [{name, effect, daysLeft}]
    blackoutDays: 0,
    buyBanDays: 0,

    // 日志
    eventLog: [],

    // 融资
    canFundraise: true,

    // 研究员
    researchers: { junior: 0, senior: 0, principal: 0 },
    lastHireDay: 0, // 上次聘请研究员的天数，用于冷却

    // 数据中心
    datacenterExpands: 0 // 已扩容次数

    // 自动存档计时器由 Game.loop 管理，不存state
  },

  autoSaveTimer: 0, // 自动存档计时器（真实秒）
  MAX_FRAME_DELTA_SECONDS: 0.25, // 防止浏览器切回前台后一次性快进大量游戏天数

  init() {
    // 初始化 GPU 库存
    for (const key of Object.keys(CONFIG.GPUS)) {
      this.state.gpuInventory[key] = 0;
    }
    this.state.nextEventDay = this.state.day + CONFIG.EVENT_MIN_DAYS + Math.floor(Math.random() * (CONFIG.EVENT_MAX_DAYS - CONFIG.EVENT_MIN_DAYS));
    this.state.lastFrame = performance.now();
    this.state.running = true;
    this.loop(performance.now());
  },

  loop(timestamp) {
    if (!this.state.running) return;
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = (timestamp - this.state.lastFrame) / 1000;
    // 页面在后台时 requestAnimationFrame 会被节流；恢复后只结算有限时长，避免跳日、连锁事件和卡顿。
    const dt = Math.max(0, Math.min(rawDt, this.MAX_FRAME_DELTA_SECONDS));
    this.state.lastFrame = timestamp;

    // 自动存档（每100真实秒）
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 100) {
      this.autoSaveTimer = 0;
      SaveSystem.save(true);
    }

    if (this.state.speed === 0 || this.state.tutorialPaused) {
      Scene.render();
      return;
    }

    const gameDt = dt * this.state.speed;
    this.state.elapsed += gameDt;

    // 每天结算
    let dayAdvanced = false;
    while (this.state.elapsed >= 1.0) {
      this.state.elapsed -= 1.0;
      this.state.day++;
      dayAdvanced = true;
      this.advanceDay();
    }

    if (dayAdvanced) {
      UI.update();
      Datacenter.updateGPUVIsuals();
    }

    // 训练进度更新
    Training.update(dt * this.state.speed);

    Scene.render();
  },

  advanceDay() {
    // 经济结算
    Economy.settleDaily();

    // 训练进度
    if (this.state.activeTrainings.length > 0) {
      Training.advanceTrainingDay();
    }

    // 研究进度
    Research.advanceDay();

    // 断电检查
    if (this.state.blackoutDays > 0) {
      this.state.blackoutDays--;
      if (this.state.blackoutDays === 0) {
        this.addLog('电网恢复，供电正常');
      }
    }

    // 禁运检查
    if (this.state.buyBanDays > 0) {
      this.state.buyBanDays--;
    }

    // 每月结算
    if (this.state.day - this.state.lastMonthlyDay >= 30) {
      this.state.lastMonthlyDay = this.state.day;
      Economy.settleMonthly();
    }

    // 融资冷却
    const daysSinceFundraise = this.state.day - this.state.lastFundraiseDay;
    this.state.canFundraise = daysSinceFundraise >= CONFIG.FUNDRAISE_COOLDOWN_DAYS;

    // 效果衰减
    this.state.activeEffects = this.state.activeEffects.filter(e => {
      if (e.daysLeft === 1 && e.effect === 'power_fault_restore') {
        this.state.powerCapacityMW = e.value;
        Game.addLog('供电设施修复，容量恢复');
      }
      e.daysLeft--;
      return e.daysLeft > 0;
    });

    // 随机事件
    if (this.state.day >= this.state.nextEventDay) {
      Events.trigger();
      this.state.nextEventDay = this.state.day + CONFIG.EVENT_MIN_DAYS + Math.floor(Math.random() * (CONFIG.EVENT_MAX_DAYS - CONFIG.EVENT_MIN_DAYS));
    }
  },

  setSpeed(speed) {
    if (this.state.tutorialPaused && speed !== 0) return;
    this.state.speed = speed;
    document.querySelectorAll('.speed-btn').forEach(b => {
      b.classList.remove('bg-accent/10', 'text-accent', 'border-accent');
      b.classList.add('border-border');
    });
    const btn = document.getElementById('btn-' + speed + 'x');
    if (btn) {
      btn.classList.add('bg-accent/10', 'text-accent', 'border-accent');
      btn.classList.remove('border-border');
    }
    if (speed === 0) {
      document.getElementById('btn-pause').classList.add('bg-accent/10', 'text-accent', 'border-accent');
    }
  },

  // GPU 额定总功耗（所有GPU满载）
  getGPUPowerMW() {
    let total = 0;
    for (const [key, count] of Object.entries(this.state.gpuInventory)) {
      const gpu = CONFIG.GPUS[key];
      if (!gpu) continue; // 防御：跳过非型号键
      total += count * gpu.power / 1_000_000;
    }
    return total;
  },

  // 已部署模型占用的推理GPU分配（按型号）
  getInferenceGPUAllocation() {
    const alloc = {};
    for (const model of this.state.deployedModels) {
      if (model.deployed && model.deploymentGPUs) {
        for (const [type, count] of Object.entries(model.deploymentGPUs)) {
          if (!CONFIG.GPUS[type]) continue; // 跳过旧存档 _legacy 占位
          alloc[type] = (alloc[type] || 0) + count;
        }
      }
    }
    return alloc;
  },

  // 已部署模型占用的推理GPU总数
  getInferenceGPUs() {
    const alloc = this.getInferenceGPUAllocation();
    return Object.values(alloc).reduce((a, b) => a + b, 0);
  },

  getActiveTrainings() {
    if (!Array.isArray(this.state.activeTrainings)) this.state.activeTrainings = this.state.activeTraining ? [this.state.activeTraining] : [];
    return this.state.activeTrainings;
  },

  syncPrimaryTraining() {
    this.state.activeTraining = this.getActiveTrainings()[0] || null;
  },

  // 默认只统计运行中的训练；暂停任务会释放 GPU，可被推理或其他训练重新分配。
  getTrainingGPUAllocation(includePaused = false) {
    const allocation = {};
    for (const training of this.getActiveTrainings()) {
      if (!includePaused && training.paused) continue;
      for (const [type, count] of Object.entries(training.gpuAllocation || {})) {
        if (CONFIG.GPUS[type]) allocation[type] = (allocation[type] || 0) + count;
      }
    }
    return allocation;
  },

  getModelMinimumInferenceH100(model) {
    return recommendedInferenceGPUs(model.params || 0);
  },

  // 混合型号按 H100 等效算力汇率校验；部署不能低于模型最低推理需求。
  meetsModelInferenceMinimum(model, allocation) {
    return effectiveInferenceGPUs(allocation) >= this.getModelMinimumInferenceH100(model);
  },

  // 可用于训练的GPU数（总数 - 推理占用）
  getAvailableGPUs() {
    const training = Object.values(this.getTrainingGPUAllocation()).reduce((a, b) => a + b, 0);
    const owned = Object.values(this.state.gpuInventory).reduce((sum, count) => sum + (Number(count) || 0), 0);
    return Math.max(0, owned - this.getInferenceGPUs() - training);
  },

  // GPU 实际功耗（训练中GPU满载，推理GPU中载，闲置GPU低功耗）
  getGPUActualPowerMW() {
    let total = 0;
    const trainingAlloc = this.getTrainingGPUAllocation(false);
    const inferenceAlloc = this.getInferenceGPUAllocation();
    // 兼容旧存档的 _legacy 分配
    const legacyTraining = trainingAlloc._legacy || 0;
    const legacyInference = inferenceAlloc._legacy || 0;
    let legacyTrainRemaining = legacyTraining;
    let legacyInfRemaining = legacyInference;

    for (const [key, count] of Object.entries(this.state.gpuInventory)) {
      const gpu = CONFIG.GPUS[key];
      if (!gpu) continue; // 防御旧存档或被篡改存档中的未知 GPU 键
      const ratedMW = gpu.power / 1_000_000;
      let trainingCount = Math.min(count, trainingAlloc[key] || 0);
      // 旧存档回退：按顺序分配训练GPU
      if (legacyTrainRemaining > 0 && trainingCount < count) {
        const legacyAdd = Math.min(count - trainingCount, legacyTrainRemaining);
        trainingCount += legacyAdd;
        legacyTrainRemaining -= legacyAdd;
      }
      let remaining = count - trainingCount;

      let inferenceCount = Math.min(remaining, inferenceAlloc[key] || 0);
      // 旧存档回退：按顺序分配推理GPU
      if (legacyInfRemaining > 0 && inferenceCount < remaining) {
        const legacyAdd = Math.min(remaining - inferenceCount, legacyInfRemaining);
        inferenceCount += legacyAdd;
        legacyInfRemaining -= legacyAdd;
      }
      remaining -= inferenceCount;

      // 训练 ~95%, 推理 ~60%, 闲置 ~15%
      total += trainingCount * ratedMW * 0.95;
      total += inferenceCount * ratedMW * CONFIG.INFERENCE_POWER_RATIO;
      total += remaining * ratedMW * 0.15;
    }
    return total;
  },

  // 实际总功耗（含冷却）
  getTotalPowerMW() {
    return this.getGPUActualPowerMW() * (1 + CONFIG.COOLING_RATIO);
  },

  // 额定总功耗（含冷却，用于显示上限）
  getRatedPowerMW() {
    return this.getGPUPowerMW() * (1 + CONFIG.COOLING_RATIO);
  },

  getTotalTFLOPS() {
    let total = 0;
    for (const [key, count] of Object.entries(this.state.gpuInventory)) {
      const gpu = CONFIG.GPUS[key];
      if (!gpu) continue; // 防御：跳过非型号键
      total += count * gpu.tflops;
    }
    return total;
  },

  addLog(msg) {
    this.state.eventLog.unshift({ day: this.state.day, msg });
    if (this.state.eventLog.length > 50) this.state.eventLog.pop();
  },

  getActiveEffects() {
    return this.state.activeEffects;
  },

  getEffMultiplier() {
    let mult = 1.0;
    for (const eff of this.state.activeEffects) {
      if (eff.effect === 'eff_penalty') mult *= (1 - eff.value);
      if (eff.effect === 'next_train_boost') mult *= (1 + eff.value);
    }
    // 研究员加成（按等级）
    const r = this.state.researchers;
    mult *= (1 + r.junior * CONFIG.RESEARCHER_TIERS.junior.effBonus);
    mult *= (1 + r.senior * CONFIG.RESEARCHER_TIERS.senior.effBonus);
    mult *= (1 + r.principal * CONFIG.RESEARCHER_TIERS.principal.effBonus);
    return mult;
  },

  getIncomeMultiplier() {
    let mult = 1.0;
    for (const eff of this.state.activeEffects) {
      if (eff.effect === 'income_penalty') mult *= (1 - eff.value);
    }
    return mult;
  }
};
