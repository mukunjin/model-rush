// Model Rush - 经济系统
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
const Economy = {
  settleDaily() {
    const s = Game.state;
    let income = 0;
    let expense = 0;

    // API 收入（已部署模型）
    for (const model of s.deployedModels) {
      if (!model.deployed) continue; // 未部署的模型不产生收入
      const scaleKey = paramsToScaleKey(model.params || 0);
      const pricePerToken = CONFIG.API_PRICE_PER_TOKEN[scaleKey] || 3e-9;
      const dau = CONFIG.DAILY_ACTIVE_USERS[scaleKey] || 500000;
      const openSourceMult = this.getModelIncomeMultiplier(model);
      let incomeBonus = 1.0;
      if (model.techs && model.techs.includes('speculative')) {
        incomeBonus += CONFIG.TECH_RESEARCH.speculative.incomeBonus * Research.getTechLevel('speculative');
      }
      if (model.techs && model.techs.includes('kv_cache')) {
        incomeBonus += CONFIG.TECH_RESEARCH.kv_cache.incomeBonus * Research.getTechLevel('kv_cache');
      }
      const dailyTokens = dau * CONFIG.AVG_DAILY_TOKENS;
      // 收入受部署GPU数量影响（按型号折算为等效H100）
      const deployTotal = effectiveInferenceGPUs(model.deploymentGPUs);
      const recInference = recommendedInferenceGPUs(model.params || 0);
      const deployRatio = recInference > 0 ? Math.min(1, deployTotal / recInference) : 1;
      income += dailyTokens * pricePerToken * openSourceMult * incomeBonus * Game.getIncomeMultiplier() * deployRatio;
    }

    // 企业授权收入（每月结算，这里不做）
    s.dailyIncome = income;

    const costs = this.getOperatingCostBreakdown();
    expense += costs.total;

    s.dailyExpense = expense;

    // 现金更新
    s.cash += income - expense;

    // 破产检查
    if (s.cash < -50_000_000) {
      this.triggerBankruptcy();
      return;
    }

    // 估值更新
    let gpuAssetValue = 0;
    for (const [key, count] of Object.entries(s.gpuInventory)) {
      const gpu = CONFIG.GPUS[key];
      if (gpu) gpuAssetValue += count * gpu.price;
    }
    s.valuation = s.cash + gpuAssetValue;
    if (s.deployedModels.length > 0) {
      const bestModel = s.deployedModels.reduce((a, b) => a.score > b.score ? a : b);
      s.valuation += bestModel.score * 100_000_000; // 模型价值
    }
  },

  // 日运营成本明细。电费已包含冷却系统耗电，避免对冷却重复计费。
  getOperatingCostBreakdown() {
    const s = Game.state;
    const electricity = Game.getTotalPowerMW() * 1000 * 24 * CONFIG.ELECTRICITY_PRICE;
    const deployedCount = s.deployedModels.filter(model => model.deployed).length;
    const network = deployedCount * CONFIG.NETWORK_DAILY_COST_PER_DEPLOYED_MODEL;
    const r = s.researchers;

    // 计算研究员薪资（指数上涨）
    let researcherSalary = 0;
    for (const tier of ['junior', 'senior', 'principal']) {
      const count = r[tier] || 0;
      const baseSalary = CONFIG.RESEARCHER_TIERS[tier].baseSalary;
      for (let i = 0; i < count; i++) {
        researcherSalary += Math.ceil(baseSalary * Math.pow(CONFIG.RESEARCHER_PRICE_MULTIPLIER, i));
      }
    }

    const salary = (CONFIG.BASE_SALARY + s.gpuTotal * CONFIG.SALARY_PER_GPU + researcherSalary) / 30;
    const rent = CONFIG.BASE_RENT / 30;
    return { electricity, network, salary, rent, total: electricity + network + salary + rent };
  },

  settleMonthly() {
    const s = Game.state;
    let enterpriseIncome = 0;

    for (const model of s.deployedModels) {
      if (!model.deployed) continue;
      enterpriseIncome += CONFIG.ENTERPRISE_BASE * (model.score / 50) * Game.getIncomeMultiplier();
    }

    s.cash += enterpriseIncome;
    Game.addLog('企业授权月度收入: +$' + Economy.formatMoney(enterpriseIncome));
  },

  fundraise() {
    const s = Game.state;
    if (!s.canFundraise) {
      const daysLeft = CONFIG.FUNDRAISE_COOLDOWN_DAYS - (s.day - s.lastFundraiseDay);
      UI.toast('融资冷却中，还需 ' + daysLeft + ' 天');
      return;
    }

    const bestModel = s.deployedModels.length > 0
      ? s.deployedModels.reduce((a, b) => a.score > b.score ? a : b)
      : null;
    const score = bestModel ? bestModel.score : 0;
    const amount = CONFIG.FUNDRAISE_BASE * (score / 100) * CONFIG.FUNDRAISE_SCORE_MULT * (0.8 + Math.random() * 0.4);

    s.cash += amount;
    s.lastFundraiseDay = s.day;
    s.canFundraise = false;
    Game.addLog('融资成功: +$' + Economy.formatMoney(amount));
    UI.toast('融资成功! +$' + Economy.formatMoney(amount));
    UI.update();
  },

  formatMoney(val) {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
    return val.toFixed(0);
  },

  // 开源模型仍可通过托管 API、企业支持和生态服务变现；默认收益低于闭源模型。
  getModelIncomeMultiplier(model) {
    if (!model.openSource) return 1;
    let multiplier = CONFIG.OPEN_SOURCE_INCOME_MULTIPLIER;
    if (model.techs && model.techs.includes('open_source_ecosystem')) {
      multiplier *= 1 + CONFIG.TECH_RESEARCH.open_source_ecosystem.openSourceIncomeBonus * Research.getTechLevel('open_source_ecosystem');
    }
    return multiplier;
  },

  triggerBankruptcy() {
    Game.state.running = false;
    Game.addLog('公司已破产! 资金链断裂，游戏结束。');
    UI.showBankruptcyModal();
  },

  buyGPUs(gpuType, racks) {
    const s = Game.state;
    const gpu = CONFIG.GPUS[gpuType];
    if (!gpu) return false;

    // 市值解锁检查
    if (s.valuation < gpu.unlockValuation) {
      UI.toast(gpu.name + ' 需要市值 $' + Economy.formatMoney(gpu.unlockValuation) + ' 解锁 (当前 $' + Economy.formatMoney(s.valuation) + ')');
      return false;
    }

    const gpuCount = racks * 8;
    const cost = gpuCount * gpu.price;

    if (s.cash < cost) {
      UI.toast('资金不足!');
      return false;
    }

    if (s.buyBanDays > 0) {
      UI.toast('芯片禁运中，无法购买GPU!');
      return false;
    }

    // 检查数据中心机架位容量（防止出现"隐形GPU"：库存有但3D无法放置）
    let canPlace = 0;
    for (let floor = 0; floor < Datacenter.FLOORS; floor++) {
      for (let row = 0; row < Datacenter.ROWS; row++) {
        for (let col = 0; col < Datacenter.COLS; col++) {
          if (Datacenter.gpuBlocks.some(b => b.row === row && b.col === col && b.floor === floor)) continue;
          if (Datacenter.isPositionBlocked(col, row)) continue;
          canPlace++;
        }
      }
    }
    if (gpuCount > canPlace) {
      UI.toast('数据中心空间不足! 剩余 ' + canPlace + ' 个机架位，本次最多购买 ' + canPlace + ' 张GPU');
      return false;
    }

    s.cash -= cost;
    s.gpuInventory[gpuType] += gpuCount;
    s.gpuTotal += gpuCount;

    // 检查供电
    const newTotalPower = Game.getTotalPowerMW();
    if (newTotalPower > s.powerCapacityMW) {
      s.blackoutDays = 3;
      Game.addLog('警告: 功耗超载! 供电不足，开始断电!');
      UI.toast('功耗超载! 断电3天!');
    }

    // 检查冷却（冷却容量需 >= 实际GPU功耗的30%）
    const gpuActualPowerMW = Game.getGPUActualPowerMW();
    if (gpuActualPowerMW * CONFIG.COOLING_RATIO > s.coolingCapacityMW) {
      Game.addLog('警告: 冷却不足! 训练效率降低30%');
      s.activeEffects.push({ name: '冷却不足', effect: 'eff_penalty', value: 0.30, daysLeft: 7 });
    }

    Datacenter.addGPUs(gpuType, gpuCount);
    Game.addLog('购买 ' + gpuCount + 'x ' + gpuType + ' GPU, 花费 $' + Economy.formatMoney(cost));
    UI.update();
    return true;
  },

  expandPower(mw) {
    const s = Game.state;
    const baseCost = CONFIG.POWER_EXPAND_BASE_COST_PER_MW * Math.pow(CONFIG.POWER_EXPAND_EXPONENT, s.powerExpands || 0);
    const cost = mw * baseCost;
    if (s.cash < cost) {
      UI.toast('资金不足!');
      return false;
    }
    s.cash -= cost;
    s.powerCapacityMW += mw;
    s.powerExpands = (s.powerExpands || 0) + 1;
    Datacenter.updatePowerRoom();
    Game.addLog('扩容供电 +' + mw + 'MW, 花费 $' + Economy.formatMoney(cost));
    UI.update();
    return true;
  },

  expandCooling(mw) {
    const s = Game.state;
    const baseCost = CONFIG.COOLING_EXPAND_BASE_COST_PER_MW * Math.pow(CONFIG.COOLING_EXPAND_EXPONENT, s.coolingExpands || 0);
    const cost = mw * baseCost;
    if (s.cash < cost) {
      UI.toast('资金不足!');
      return false;
    }
    s.cash -= cost;
    s.coolingCapacityMW += mw;
    s.coolingExpands = (s.coolingExpands || 0) + 1;
    Datacenter.updateCoolingTower();
    Game.addLog('扩容冷却 +' + mw + 'MW, 花费 $' + Economy.formatMoney(cost));
    UI.update();
    return true;
  },

  hireResearcher(tier) {
    const s = Game.state;
    const tierConfig = CONFIG.RESEARCHER_TIERS[tier];
    if (!tierConfig) return false;

    // 市值解锁检查
    if (s.valuation < tierConfig.unlockValuation) {
      UI.toast(tierConfig.name + ' 需要市值 $' + Economy.formatMoney(tierConfig.unlockValuation) + ' 解锁 (当前 $' + Economy.formatMoney(s.valuation) + ')');
      return false;
    }

    // 冷却检查
    const daysSinceLastHire = s.day - s.lastHireDay;
    if (s.lastHireDay > 0 && daysSinceLastHire < CONFIG.RESEARCHER_HIRE_COOLDOWN) {
      const remaining = CONFIG.RESEARCHER_HIRE_COOLDOWN - daysSinceLastHire;
      UI.toast('招聘冷却中，还需 ' + remaining + ' 天');
      return false;
    }

    // 计算当前薪资（指数上涨）
    const currentCount = s.researchers[tier] || 0;
    const salary = Math.ceil(tierConfig.baseSalary * Math.pow(CONFIG.RESEARCHER_PRICE_MULTIPLIER, currentCount));

    // 检查资金
    if (s.cash < salary) {
      UI.toast('资金不足! 需要月薪 $' + Economy.formatMoney(salary));
      return false;
    }

    s.researchers[tier]++;
    s.lastHireDay = s.day;
    Game.addLog('聘请' + tierConfig.name + ' (#' + s.researchers[tier] + '), 月薪 $' + Economy.formatMoney(salary));
    UI.update();
    return true;
  },

  getTotalResearchers() {
    const r = Game.state.researchers;
    return r.junior + r.senior + r.principal;
  },

  demolishGPUs(gpuType, count) {
    const s = Game.state;
    const gpu = CONFIG.GPUS[gpuType];
    if (!gpu) return false;

    const current = s.gpuInventory[gpuType] || 0;
    // 计算被占用的GPU数量（训练 + 推理）
    const trainingAlloc = Game.getTrainingGPUAllocation();
    const inferenceAlloc = Game.getInferenceGPUAllocation();
    const used = (trainingAlloc[gpuType] || 0) + (inferenceAlloc[gpuType] || 0);
    const available = Math.max(0, current - used);

    const toRemove = Math.min(count, available);
    if (toRemove <= 0) {
      if (current > 0) {
        UI.toast(gpu.name + ' 全部被占用(训练' + (trainingAlloc[gpuType] || 0) + '/推理' + (inferenceAlloc[gpuType] || 0) + ')，需先释放资源');
      } else {
        UI.toast('没有可拆除的GPU!');
      }
      return false;
    }

    const refund = Math.floor(gpu.price * 0.5) * toRemove;
    s.gpuInventory[gpuType] -= toRemove;
    s.gpuTotal -= toRemove;
    s.cash += refund;
    Datacenter.removeGPUs(gpuType, toRemove);
    Game.addLog('拆除 ' + toRemove + 'x ' + gpuType + ' GPU, 返还 $' + Economy.formatMoney(refund));
    UI.update();
    return true;
  },

  expandDatacenter() {
    const s = Game.state;
    const cost = CONFIG.DATACENTER_EXPAND_BASE_COST * Math.pow(CONFIG.DATACENTER_EXPAND_EXPONENT, s.datacenterExpands);
    if (s.cash < cost) {
      UI.toast('资金不足! 需要 $' + Economy.formatMoney(cost));
      return false;
    }
    s.cash -= cost;
    s.datacenterExpands++;
    const expansion = Datacenter.expand();
    // 更新视觉中性点到中间楼层
    if (typeof Scene !== 'undefined' && Scene.updateCameraTarget) {
      Scene.updateCameraTarget();
    }
    Game.addLog('加盖第 ' + Datacenter.FLOORS + ' 层：新增 ' + expansion.addedSlots + ' 个 GPU 位（总计 ' + expansion.totalSlots + ' 位），花费 $' + Economy.formatMoney(cost));
    UI.update();
    return true;
  }
};
