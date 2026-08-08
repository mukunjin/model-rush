// Model Rush - 存档系统（LocalStorage）
const SaveSystem = {
  LEGACY_SAVE_KEY: 'model_rush_save',
  SLOTS_KEY: 'model_rush_save_slots',
  LAST_SLOT_KEY: 'model_rush_last_slot',
  currentSlotId: null,

  slotKey(id) { return 'model_rush_save_slot_' + id; },

  // 旧版单存档自动迁移，保证已有进度不会丢失。
  migrateLegacySave() {
    const existing = JSON.parse(localStorage.getItem(this.SLOTS_KEY) || '[]');
    if (existing.length > 0 || !localStorage.getItem(this.LEGACY_SAVE_KEY)) return existing;
    try {
      const data = JSON.parse(localStorage.getItem(this.LEGACY_SAVE_KEY));
      if (!data || !data.gameState) return existing;
      const id = 'legacy_' + Date.now();
      const slot = { id, name: (data.companyName || '旧存档') + ' · 旧存档', companyName: data.companyName || '旧存档', day: data.gameState.day || 1, cash: data.gameState.cash || 0, timestamp: data.timestamp || Date.now() };
      localStorage.setItem(this.slotKey(id), JSON.stringify(data));
      localStorage.setItem(this.SLOTS_KEY, JSON.stringify([slot]));
      localStorage.setItem(this.LAST_SLOT_KEY, id);
      return [slot];
    } catch (e) { return existing; }
  },

  getSlots() {
    try {
      const slots = this.migrateLegacySave();
      return slots.filter(slot => localStorage.getItem(this.slotKey(slot.id))).sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) { return []; }
  },

  updateSlotMeta(id, data, name) {
    const slots = this.getSlots();
    const old = slots.find(slot => slot.id === id);
    const meta = { id, name: name || old?.name || data.companyName || '未命名存档', companyName: data.companyName || '', day: data.gameState.day || 1, cash: data.gameState.cash || 0, timestamp: data.timestamp };
    const next = [meta, ...slots.filter(slot => slot.id !== id)];
    localStorage.setItem(this.SLOTS_KEY, JSON.stringify(next));
  },

  createSlot(name) {
    const id = 'slot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    this.currentSlotId = id;
    this.save(true, id, name || (Game.state.companyName + ' · 存档'));
    return id;
  },

  // 保存游戏（silent=true 用于自动存档，显示提示）
  save(silent, slotId = this.currentSlotId, slotName) {
    const s = Game.state;
    const data = {
      version: 2,
      timestamp: Date.now(),
      companyName: s.companyName,
      gameState: {
        cash: s.cash,
        valuation: s.valuation,
        day: s.day,
        speed: s.speed,
        gpuInventory: s.gpuInventory,
        gpuTotal: s.gpuTotal,
        powerCapacityMW: s.powerCapacityMW,
        coolingCapacityMW: s.coolingCapacityMW,
        activeTraining: s.activeTraining ? { ...s.activeTraining } : null,
        activeTrainings: Game.getActiveTrainings().map(t => ({ ...t })),
        deployedModels: s.deployedModels,
        completedModels: s.completedModels,
        dailyIncome: s.dailyIncome,
        dailyExpense: s.dailyExpense,
        lastMonthlyDay: s.lastMonthlyDay,
        lastFundraiseDay: s.lastFundraiseDay,
        nextEventDay: s.nextEventDay,
        activeEffects: s.activeEffects,
        blackoutDays: s.blackoutDays,
        buyBanDays: s.buyBanDays,
        eventLog: s.eventLog,
        canFundraise: s.canFundraise,
        researchers: s.researchers,
        lastHireDay: s.lastHireDay,
        datacenterExpands: s.datacenterExpands
      },
      researchState: Research.state,
      dataCollectionState: DataCollection.state,
      datacenter: {
        ROWS: Datacenter.ROWS,
        COLS: Datacenter.COLS,
        gpuBlocks: Datacenter.gpuBlocks.map(b => ({
          type: b.type,
          row: b.row,
          col: b.col,
          training: b.training
        }))
      }
    };
    try {
      if (!slotId) slotId = this.createSlot(slotName || (s.companyName + ' · 存档'));
      this.currentSlotId = slotId;
      localStorage.setItem(this.slotKey(slotId), JSON.stringify(data));
      this.updateSlotMeta(slotId, data, slotName);
      localStorage.setItem(this.LAST_SLOT_KEY, slotId);
      if (silent) {
        // 自动存档不弹toast，仅记日志
        Game.addLog('自动存档已保存');
      } else {
        UI.toast('游戏已保存');
        Game.addLog('存档已保存');
      }
      return true;
    } catch (e) {
      UI.toast('保存失败: ' + e.message);
      return false;
    }
  },

  // 加载游戏
  load(slotId) {
    try {
      const slots = this.getSlots();
      const target = slotId || localStorage.getItem(this.LAST_SLOT_KEY) || slots[0]?.id;
      const raw = target ? localStorage.getItem(this.slotKey(target)) : null;
      if (!raw) {
        UI.toast('没有找到存档');
        return false;
      }
      const data = JSON.parse(raw);
      if (!data.version || !data.gameState) {
        UI.toast('存档格式无效');
        return false;
      }
      this.currentSlotId = target;
      localStorage.setItem(this.LAST_SLOT_KEY, target);
      return this.restore(data);
    } catch (e) {
      UI.toast('加载失败: ' + e.message);
      return false;
    }
  },

  // 恢复游戏状态
  restore(data) {
    const gs = data.gameState;
    const s = Game.state;

    // 恢复公司名称（保存在顶层）
    s.companyName = data.companyName || s.companyName || '';

    // 恢复游戏状态
    s.cash = gs.cash !== undefined ? gs.cash : CONFIG.INITIAL_CASH;
    s.valuation = gs.valuation !== undefined ? gs.valuation : CONFIG.INITIAL_CASH;
    s.day = gs.day !== undefined ? gs.day : 1;
    s.speed = Math.min(gs.speed === undefined ? 1 : gs.speed, 2); // 旧存档可能有已移除的5x
    // 补全 GPU 库存（旧存档可能缺少新增型号键，缺失会导致功耗计算NaN）
    s.gpuInventory = {};
    if (gs.gpuInventory && typeof gs.gpuInventory === 'object') {
      for (const key of Object.keys(CONFIG.GPUS)) {
        s.gpuInventory[key] = typeof gs.gpuInventory[key] === 'number' ? gs.gpuInventory[key] : 0;
      }
    } else {
      for (const key of Object.keys(CONFIG.GPUS)) {
        s.gpuInventory[key] = 0;
      }
    }
    s.gpuTotal = gs.gpuTotal || 0;
    s.powerCapacityMW = gs.powerCapacityMW !== undefined ? gs.powerCapacityMW : CONFIG.INITIAL_POWER_CAPACITY_MW;
    s.coolingCapacityMW = gs.coolingCapacityMW !== undefined ? gs.coolingCapacityMW : CONFIG.INITIAL_COOLING_CAPACITY_MW;
    s.activeTrainings = Array.isArray(gs.activeTrainings) ? gs.activeTrainings : (gs.activeTraining ? [gs.activeTraining] : []);
    Game.syncPrimaryTraining();
    s.deployedModels = gs.deployedModels || [];
    s.completedModels = gs.completedModels || [];

    // === 存档迁移：旧格式兼容 ===
    // 迁移训练任务
    for (const t of Game.getActiveTrainings()) {
      if (!t.params && t.scale) {
        const sc = CONFIG.MODEL_SCALES[t.scale];
        if (sc) {
          t.params = sc.params;
          t.label = sc.label;
        }
      }
      if (!t.gpuAllocation && t.gpuAllocated) {
        // 旧存档只有数量，无型号分配；用一个占位分配
        t.gpuAllocation = { _legacy: t.gpuAllocated };
      }
      if (!t.id) t.id = 'train_restore_' + s.day + '_' + Math.random().toString(36).slice(2);
      if (t.paused === undefined) t.paused = false;
    }
    Game.syncPrimaryTraining();
    // 迁移已部署模型
    for (const model of s.deployedModels) {
      if (!model.params && model.scale) {
        const sc = Object.values(CONFIG.MODEL_SCALES).find(v => v.label === model.scale);
        if (sc) {
          model.params = sc.params;
          model.label = model.scale;
        }
      }
      if (model.deployed === undefined) model.deployed = true; // 旧存档默认已部署
      if (!model.deploymentGPUs && model.deployed) {
        // 旧存档没有部署GPU信息，用推荐数量占位
        const rec = recommendedInferenceGPUs(model.params || 70e9);
        model.deploymentGPUs = { _legacy: rec };
      }
    }
    s.dailyIncome = gs.dailyIncome || 0;
    s.dailyExpense = gs.dailyExpense || 0;
    s.lastMonthlyDay = gs.lastMonthlyDay || 1;
    s.lastFundraiseDay = gs.lastFundraiseDay !== undefined ? gs.lastFundraiseDay : -CONFIG.FUNDRAISE_COOLDOWN_DAYS;
    s.nextEventDay = gs.nextEventDay || (s.day + CONFIG.EVENT_MIN_DAYS + Math.floor(Math.random() * (CONFIG.EVENT_MAX_DAYS - CONFIG.EVENT_MIN_DAYS)));
    s.activeEffects = gs.activeEffects || [];
    s.blackoutDays = gs.blackoutDays || 0;
    s.buyBanDays = gs.buyBanDays || 0;
    s.eventLog = gs.eventLog || [];
    s.canFundraise = gs.canFundraise !== undefined ? gs.canFundraise : true;
    s.researchers = Object.assign({ junior: 0, senior: 0, principal: 0 }, gs.researchers || {});
    s.lastHireDay = gs.lastHireDay || 0;
    s.datacenterExpands = gs.datacenterExpands || 0;

    // 恢复研究状态（防御性处理）
    if (data.researchState && typeof data.researchState === 'object') {
      Research.state = {
        unlocked: Array.isArray(data.researchState.unlocked) ? data.researchState.unlocked : [],
        researching: (data.researchState.researching && typeof data.researchState.researching === 'object') ? data.researchState.researching : {},
        queue: Array.isArray(data.researchState.queue) ? data.researchState.queue : []
      };
    }

    // 恢复数据采集状态（防御性处理）
    if (data.dataCollectionState && typeof data.dataCollectionState === 'object') {
      DataCollection.state = data.dataCollectionState;
      // 确保 sources 完整
      if (!DataCollection.state.sources || typeof DataCollection.state.sources !== 'object') {
        DataCollection.state.sources = {};
      }
      for (const key of Object.keys(CONFIG.DATA_SOURCES)) {
        if (typeof DataCollection.state.sources[key] !== 'number') {
          DataCollection.state.sources[key] = 0;
        }
      }
    }

    // 恢复数据中心（防御：旧存档可能没有datacenter字段）
    if (data.datacenter) {
      Datacenter.ROWS = data.datacenter.ROWS || Datacenter.ROWS;
      Datacenter.COLS = data.datacenter.COLS || Datacenter.COLS;
      Datacenter.rebuildGPUBlocks(data.datacenter.gpuBlocks || []);
      Datacenter.updatePlatform();
      Datacenter.updateGround();
      // 旧存档"隐形GPU"提示（库存超过已放置机架数）
      const placed = Datacenter.gpuBlocks.length;
      if (s.gpuTotal > placed) {
        Game.addLog('警告: 有 ' + (s.gpuTotal - placed) + ' 张GPU因机架位不足未显示，请扩容数据中心');
      }
    }

    // 重置运行状态
    Datacenter.unmarkTrainingGPUs();
    if (Game.getActiveTrainings().length > 0) Datacenter.markTrainingGPUs(Game.getTrainingGPUAllocation());
    s.elapsed = 0;
    s.lastFrame = performance.now();
    s.running = true;

    // 刷新UI
    Game.setSpeed(s.speed);
    UI.update();
    Game.addLog('存档已加载 (第 ' + s.day + ' 天)');
    UI.toast('存档已加载');
    return true;
  },

  // 删除存档并重置游戏
  delete(slotId = this.currentSlotId) {
    try {
      if (!slotId) return false;
      localStorage.removeItem(this.slotKey(slotId));
      const slots = this.getSlots().filter(slot => slot.id !== slotId);
      localStorage.setItem(this.SLOTS_KEY, JSON.stringify(slots));
      if (localStorage.getItem(this.LAST_SLOT_KEY) === slotId) localStorage.removeItem(this.LAST_SLOT_KEY);
      const deletingCurrent = slotId === this.currentSlotId;
      if (deletingCurrent) {
        this.currentSlotId = null;
        this.resetGame();
      }
      return true;
    } catch (e) {
      UI.toast('删除失败');
      return false;
    }
  },

  // 重置游戏状态并回到启动界面
  resetGame() {
    // 停止游戏循环
    Game.state.running = false;
    Game.state.speed = 0;

    // 清除所有3D对象
    if (Datacenter.gpuBlocks) {
      for (const block of Datacenter.gpuBlocks) {
        if (block.group) Scene.scene.remove(block.group);
      }
      Datacenter.gpuBlocks = [];
    }

    // 重置游戏状态到初始值
    const s = Game.state;
    s.cash = CONFIG.INITIAL_CASH;
    s.valuation = CONFIG.INITIAL_CASH;
    s.day = 1;
    s.elapsed = 0;
    s.speed = 1;
    s.gpuInventory = {};
    for (const key of Object.keys(CONFIG.GPUS)) {
      s.gpuInventory[key] = 0;
    }
    s.gpuTotal = 0;
    s.powerCapacityMW = CONFIG.INITIAL_POWER_CAPACITY_MW;
    s.coolingCapacityMW = CONFIG.INITIAL_COOLING_CAPACITY_MW;
    s.activeTraining = null;
    s.activeTrainings = [];
    s.deployedModels = [];
    s.completedModels = [];
    s.dailyIncome = 0;
    s.dailyExpense = 0;
    s.lastMonthlyDay = 1;
    s.lastFundraiseDay = -CONFIG.FUNDRAISE_COOLDOWN_DAYS;
    s.nextEventDay = 0;
    s.activeEffects = [];
    s.blackoutDays = 0;
    s.buyBanDays = 0;
    s.eventLog = [];
    s.canFundraise = true;
    s.researchers = { junior: 0, senior: 0, principal: 0 };
    s.lastHireDay = 0;
    s.datacenterExpands = 0;
    s.companyName = '';
    Game.autoSaveTimer = 0;

    // 重置研究状态
    Research.state = { unlocked: [], researching: {}, queue: [] };

    // 重置数据采集
    DataCollection.state = { sources: {}, collected: false, totalTokens: 0, avgQuality: 0 };
    DataCollection.init();

    // 刷新UI显示
    UI.update();

    // 显示启动界面
    document.getElementById('startup-overlay').style.display = 'flex';
    document.getElementById('company-name-input').value = '';
    document.getElementById('company-name-display').textContent = '';

    UI.toast('存档已删除，游戏已重置');
  },

  // 是否有存档
  hasSave() {
    return this.getSlots().length > 0;
  },

  // 获取存档信息
  getSaveInfo(slotId = this.currentSlotId) {
    try {
      const raw = slotId ? localStorage.getItem(this.slotKey(slotId)) : null;
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        companyName: data.companyName,
        day: data.gameState.day,
        cash: data.gameState.cash,
        timestamp: data.timestamp,
        gpuTotal: data.gameState.gpuTotal
      };
    } catch (e) {
      return null;
    }
  }
};
