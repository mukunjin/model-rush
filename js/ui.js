// Model Rush - UI 更新与交互
const UI = {
  init() {
    UI.update();
    UI.initPanelTabs();
    UI.initPanelResize();
    UI.initDropdownClose();
    UI.initMobilePanel();
  },

  // 移动端面板切换
  toggleMobilePanel() {
    const panel = document.getElementById('right-panel');
    if (panel) panel.classList.toggle('mobile-open');
  },

  initMobilePanel() {
    // 点击面板外关闭（移动端）
    document.getElementById('scene-container').addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && e.target.id === 'scene-container') {
        const panel = document.getElementById('right-panel');
        if (panel) panel.classList.remove('mobile-open');
      }
    });
  },

  initPanelTabs() {
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('.tab-panel[data-tab="' + target + '"]').classList.add('active');
      });
    });
  },

  initPanelResize() {
    const handle = document.getElementById('panel-resize-handle');
    const panel = document.getElementById('right-panel');
    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e2) => {
        const dx = e2.clientX - startX;
        const newWidth = Math.max(280, Math.min(500, startWidth - dx));
        panel.style.width = newWidth + 'px';
        // 面板宽度变化会改变场景容器尺寸，同步Three.js渲染器（否则场景区露出暗色背景/错位）
        if (typeof Scene !== 'undefined' && Scene.onResize) Scene.onResize();
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  },

  initDropdownClose() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-group')) {
        UI.closeDropdown();
      }
    });
  },

  toggleDropdown(btn) {
    const group = btn.closest('.dropdown-group');
    const isOpen = group.classList.contains('open');
    UI.closeDropdown();
    if (!isOpen) {
      group.classList.add('open');
    }
  },

  closeDropdown() {
    document.querySelectorAll('.dropdown-group.open').forEach(g => g.classList.remove('open'));
  },

  update() {
    const s = Game.state;

    // 顶部栏
    document.getElementById('cash').textContent = '$' + Economy.formatMoney(s.cash);
    document.getElementById('valuation').textContent = '$' + Economy.formatMoney(s.valuation);
    document.getElementById('day').textContent = s.day;
    if (s.speed === 0) document.getElementById('day').textContent = s.day + ' (暂停)';

    // 预览概览
    UI.updateOverview();

    // 右侧面板 - 财务
    document.getElementById('panel-income').textContent = '+$' + Economy.formatMoney(s.dailyIncome);
    document.getElementById('panel-expense').textContent = '-$' + Economy.formatMoney(s.dailyExpense);
    const profit = s.dailyIncome - s.dailyExpense;
    const profitEl = document.getElementById('panel-profit');
    profitEl.textContent = (profit >= 0 ? '+' : '') + '$' + Economy.formatMoney(profit);
    profitEl.className = 'font-mono text-right ' + (profit >= 0 ? 'text-accent' : 'text-danger');
    document.getElementById('panel-cash').textContent = '$' + Economy.formatMoney(s.cash);

    // 训练状态
    UI.updateTrainingStatus();

    // 产品列表
    UI.updateProducts();

    // 排行榜
    UI.updateResearch();

    // GPU 库存
    UI.updateGPUInventory();

    // 事件日志
    UI.updateEventLog();

    // 融资按钮
    document.getElementById('btn-fundraise').textContent = s.canFundraise ? '发起融资' : '融资冷却中';

    // 研究员
    const r = s.researchers;
    const totalR = r.junior + r.senior + r.principal;
    document.getElementById('panel-researcher').textContent = totalR + ' (J:' + r.junior + ' S:' + r.senior + ' P:' + r.principal + ')';
  },

  updateOverview() {
    const s = Game.state;
    const el = document.getElementById('overview-summary');
    if (!el) return;

    let html = '';
    // 训练状态简报
    if (Game.getActiveTrainings().length > 0) {
      const prog = Training.getProgress();
      if (prog && !prog.collapsed) {
        html += '<div><span class="text-muted">训练中:</span> <span class="text-accent">' + Game.getActiveTrainings().length + ' 个任务</span>（首个：' + prog.modelName + '）</div>';
        html += '<div><span class="text-muted">进度:</span> <span class="font-mono">' + prog.overallProgress.toFixed(0) + '%</span> | 剩余 <span class="font-mono">' + prog.remainingDays + '</span>天</div>';
      } else if (prog && prog.collapsed) {
        html += '<div class="text-danger">训练崩坏: ' + prog.modelName + '</div>';
      }
    } else {
      html += '<div class="text-muted">无训练任务</div>';
    }

    // 部署模型简报
    const deployed = s.deployedModels.filter(m => m.deployed);
    if (deployed.length > 0) {
      const bestModel = deployed.reduce((a, b) => a.score > b.score ? a : b);
      html += '<div><span class="text-muted">已部署:</span> ' + deployed.length + ' 个模型 | 最高分 <span class="text-accent font-mono">' + bestModel.score.toFixed(1) + '</span></div>';
    } else {
      html += '<div class="text-muted">无已部署模型</div>';
    }

    // GPU使用简报
    const inferenceGPUs = Game.getInferenceGPUs();
    const trainingGPUs = Object.values(Game.getTrainingGPUAllocation()).reduce((a, b) => a + b, 0);
    const idleGPUs = s.gpuTotal - inferenceGPUs - trainingGPUs;
    html += '<div><span class="text-muted">GPU:</span> <span class="font-mono">' + s.gpuTotal + '</span> 总计';
    if (s.gpuTotal > 0) {
      html += ' (<span class="text-amber">' + trainingGPUs + '</span>训练 <span class="text-amber">' + inferenceGPUs + '</span>推理 <span class="text-accent">' + idleGPUs + '</span>空闲)';
    }
    html += '</div>';

    // 研发简报
    const researching = Research.getResearchingList();
    if (researching.length > 0) {
      html += '<div><span class="text-muted">研发中:</span> ' + researching.map(r => r.name).join(', ') + '</div>';
    }

    // 警告
    const totalPower = Game.getTotalPowerMW();
    if (totalPower > s.powerCapacityMW) {
      html += '<div class="text-danger">供电超载! ' + totalPower.toFixed(2) + '/' + s.powerCapacityMW + ' MW</div>';
    }
    const actualGPUPower = Game.getGPUActualPowerMW();
    const coolingLoad = actualGPUPower * CONFIG.COOLING_RATIO;
    if (coolingLoad > s.coolingCapacityMW) {
      html += '<div class="text-danger">冷却不足! ' + coolingLoad.toFixed(2) + '/' + s.coolingCapacityMW + ' MW</div>';
    }
    if (s.blackoutDays > 0) {
      html += '<div class="text-danger">断电中: 剩余 ' + s.blackoutDays + ' 天</div>';
    }

    el.innerHTML = html || '<div class="text-muted">无数据</div>';
  },

  updateTrainingStatus() {
    const statusEl = document.getElementById('training-status');
    const progressEl = document.getElementById('training-progress');
    statusEl.classList.add('hidden');
    progressEl.classList.remove('hidden');
    document.getElementById('abandon-train-btn').classList.remove('hidden');
    const tasks = Game.getActiveTrainings();
    if (tasks.length === 0) {
      statusEl.classList.remove('hidden');
      statusEl.textContent = '暂无训练任务';
      progressEl.classList.add('hidden');
      return;
    }
    let html = '';
    for (const task of tasks) {
      const prog = Training.getProgress(task.id);
      if (!prog) continue;
      html += '<div class="border border-border rounded p-2 mb-2">' +
        '<div class="flex justify-between"><span class="font-bold">' + prog.modelName + '</span><span class="font-mono text-accent">' + prog.overallProgress.toFixed(1) + '%</span></div>' +
        '<div class="progress-bar mt-1"><div class="progress-fill" style="width:' + prog.overallProgress + '%"></div></div>' +
        '<div class="text-muted mt-1">' + (task.paused ? '已暂停' : prog.phase) + ' · 剩余 ' + prog.remainingDays + ' 天 · ' + task.gpuAllocated + ' GPU</div>' +
        '<div class="flex gap-2 mt-1"><button class="text-xs text-amber" onclick="Training.togglePause(\'' + task.id + '\')">' + (task.paused ? '恢复训练' : '暂停训练') + '</button><button class="text-xs text-danger" onclick="Training.abandonTraining(\'' + task.id + '\')">放弃</button></div>' +
        '</div>';
    }
    statusEl.innerHTML = html;
    statusEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
  },

  updateResearch() {
    const el = document.getElementById('research-progress');
    const researching = Research.getResearchingList();
    let html = '';
    if (researching.length === 0) {
      html = '<div class="text-muted italic">暂无研发项目</div>';
    }
    for (const r of researching) {
      html += '<div class="mb-1"><div class="flex justify-between text-xs"><span>' + r.name + '</span><span class="font-mono">' + r.remaining + '天</span></div>' +
        '<div class="progress-bar mt-0.5"><div class="progress-fill" style="width:' + r.progress + '%"></div></div></div>';
    }
    el.innerHTML = html || '<div class="text-muted italic">暂无研发项目</div>';

    const unlockedEl = document.getElementById('unlocked-techs');
    const techStatus = Research.getTechStatus();
    let unlockedHtml = '';
    for (const [key, tech] of Object.entries(techStatus)) {
      if (tech.status === 'unlocked') {
        unlockedHtml += '<div class="text-xs text-accent">' + tech.name + ' <span class="text-muted">' + tech.effect + '</span></div>';
      }
    }
    unlockedEl.innerHTML = unlockedHtml || '<div class="text-muted italic">暂无已解锁技术</div>';
  },

  updateGPUInventory() {
    const s = Game.state;
    const el = document.getElementById('gpu-inventory');
    let html = '';
    for (const [key, count] of Object.entries(s.gpuInventory)) {
      if (count > 0) {
        const gpu = CONFIG.GPUS[key];
        const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
        html += '<div class="flex justify-between text-xs">' +
          '<span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:' + colorHex + '"></span>' + key + '</span>' +
          '<span class="font-mono">' + count + '</span>' +
          '</div>';
      }
    }
    el.innerHTML = html || '<div class="text-muted italic">暂无GPU</div>';

    const totalPower = Game.getTotalPowerMW();
    const ratedPower = Game.getRatedPowerMW();
    const actualGPUPower = Game.getGPUActualPowerMW();
    const coolingLoad = actualGPUPower * CONFIG.COOLING_RATIO;
    const isTraining = Game.getActiveTrainings().length > 0;
    const inferenceGPUs = Game.getInferenceGPUs();
    const availableGPUs = Game.getAvailableGPUs();
    document.getElementById('panel-power').textContent = totalPower.toFixed(2);
    document.getElementById('panel-power-cap').textContent = s.powerCapacityMW + '';
    document.getElementById('panel-cooling-load').textContent = coolingLoad.toFixed(2);
    document.getElementById('panel-cooling-cap').textContent = s.coolingCapacityMW + '';
    document.getElementById('panel-gpu-total').textContent = s.gpuTotal + (inferenceGPUs > 0 ? ' (推理 ' + inferenceGPUs + ' / 可用 ' + availableGPUs + ')' : '');

    // 功耗状态提示
    const powerEl = document.getElementById('panel-power');
    const coolingEl = document.getElementById('panel-cooling-load');
    if (totalPower > s.powerCapacityMW) {
      powerEl.className = 'font-mono text-danger';
    } else if (isTraining) {
      powerEl.className = 'font-mono text-amber';
    } else {
      powerEl.className = 'font-mono text-muted';
    }
    if (coolingLoad > s.coolingCapacityMW) {
      coolingEl.className = 'font-mono text-danger';
    } else if (isTraining) {
      coolingEl.className = 'font-mono text-amber';
    } else {
      coolingEl.className = 'font-mono text-muted';
    }
  },

  updateProducts() {
    const el = document.getElementById('products-list');
    if (!el) return;
    const s = Game.state;
    const models = s.deployedModels;

    if (models.length === 0) {
      el.innerHTML = '<div class="text-muted italic">尚未部署任何模型。完成训练后选择GPU部署模型即可产生收入。</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const scoreColor = model.score >= 70 ? '#00cc66' : model.score >= 50 ? '#e6a817' : '#e74c3c';
      const label = model.label || formatParams(model.params) || model.scale || '--';

      // 部署GPU信息
      const deployGPUs = model.deploymentGPUs || {};
      const deployTotal = Object.values(deployGPUs).reduce((a, b) => a + b, 0);
      const deployEquiv = effectiveInferenceGPUs(deployGPUs);
      const deployStr = Object.entries(deployGPUs).map(([k, v]) => k + '×' + v).join(', ') || '未分配';

      // 计算该模型的日收入
      const scaleKey = paramsToScaleKey(model.params || 0);
      const pricePerToken = CONFIG.API_PRICE_PER_TOKEN[scaleKey] || 3e-9;
      const dau = CONFIG.DAILY_ACTIVE_USERS[scaleKey] || 500000;
      const openSourceMult = Economy.getModelIncomeMultiplier(model);
      let incomeBonus = 1.0;
      if (model.techs && model.techs.includes('speculative')) incomeBonus += CONFIG.TECH_RESEARCH.speculative.incomeBonus;
      if (model.techs && model.techs.includes('kv_cache')) incomeBonus += CONFIG.TECH_RESEARCH.kv_cache.incomeBonus;
      const dailyTokens = dau * CONFIG.AVG_DAILY_TOKENS;
      // 收入受部署GPU数量影响（按型号折算等效H100，不足时收入按比例降低）
      const recInference = recommendedInferenceGPUs(model.params || 0);
      const deployRatio = recInference > 0 ? Math.min(1, deployEquiv / recInference) : 1;
      const dailyIncome = dailyTokens * pricePerToken * openSourceMult * incomeBonus * Game.getIncomeMultiplier() * deployRatio;

      html += '<div class="border border-border rounded p-2 mb-1">' +
        '<div class="flex justify-between items-center">' +
        '<span class="font-bold text-sm">' + model.name + '</span>' +
        '<div class="flex items-center gap-2">' +
        '<span class="font-mono text-base" style="color:' + scoreColor + '">' + model.score.toFixed(1) + '</span>' +
        '<button onclick="UI.showAdjustDeploymentModal(' + i + ')" class="text-accent hover:text-white text-xs px-1 rounded border border-accent/40 hover:bg-accent/20" title="增减或替换该模型使用的GPU">调配 GPU</button>' +
        '<button onclick="UI.removeDeployedModel(' + i + ')" class="text-danger hover:text-white text-xs px-1 rounded border border-danger/40 hover:bg-danger/20" title="下架模型(释放推理GPU)">下架</button>' +
        '</div>' +
        '</div>' +
        '<div class="text-xs text-muted mt-0.5">' + label + ' | ' + (model.openSource ? '开源' : '闭源') + ' | 推理 <span class="text-amber font-mono">' + deployTotal + ' GPU</span> (等效H100 ×<span class="text-amber font-mono">' + deployEquiv.toFixed(1) + '</span>)</div>' +
        '<div class="text-xs text-muted mt-0.5">部署: ' + deployStr + (deployRatio < 1 ? ' <span class="text-danger">(不足, 收入' + Math.round(deployRatio * 100) + '%)</span>' : '') + '</div>' +
        '<div class="grid grid-cols-2 gap-0.5 mt-1 text-xs">' +
        '<span class="text-muted">日收入</span><span class="font-mono text-right text-accent">+$' + Economy.formatMoney(dailyIncome) + (model.openSource ? ' <span class="text-muted">(开源托管)</span>' : '') + '</span>';

      // 基准测试分项
      if (model.benchmarkBreakdown) {
        for (const [bk, val] of Object.entries(model.benchmarkBreakdown)) {
          const bm = CONFIG.BENCHMARKS[bk];
          if (bm) {
            html += '<span class="text-muted">' + bm.name + '</span><span class="font-mono text-right">' + val.toFixed(1) + '</span>';
          }
        }
      }

      // 使用的技术
      if (model.techs && model.techs.length > 0) {
        const techNames = model.techs.map(t => CONFIG.TECH_RESEARCH[t] ? CONFIG.TECH_RESEARCH[t].name : t).join(', ');
        html += '<span class="text-muted col-span-2 mt-1">技术: ' + techNames + '</span>';
      }

      html += '</div></div>';
    }
    el.innerHTML = html;
  },

  removeDeployedModel(idx) {
    const s = Game.state;
    const model = s.deployedModels[idx];
    if (!model) return;
    const freedGPUs = model.deploymentGPUs ? Object.values(model.deploymentGPUs).reduce((a, b) => a + b, 0) : 0;
    s.deployedModels.splice(idx, 1);
    Game.addLog('下架模型: ' + model.name + ' (释放 ' + freedGPUs + ' GPU)');
    UI.toast('已下架 ' + model.name + ', 释放 ' + freedGPUs + ' GPU');
    UI.update();
  },

  updateEventLog() {
    const el = document.getElementById('event-log');
    const logs = Game.state.eventLog.slice(0, 20);
    el.innerHTML = logs.map(l => '<div class="text-xs text-muted">[Day ' + l.day + '] ' + l.msg + '</div>').join('');
  },

  showModal(type) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');

    let html = '';
    switch (type) {
      case 'buy-gpu': html = UI.buildBuyGPUModal(); break;
      case 'demolish-gpu': html = UI.buildDemolishGPUModal(); break;
      case 'expand-power': html = UI.buildExpandPowerModal(); break;
      case 'expand-cooling': html = UI.buildExpandCoolingModal(); break;
      case 'expand-datacenter': html = UI.buildExpandDatacenterModal(); break;
      case 'collect-data': html = UI.buildCollectDataModal(); break;
      case 'new-training': html = UI.buildTrainingModal(); break;
      case 'hire-researcher': html = UI.buildHireResearcherModal(); break;
      case 'research': html = UI.buildResearchModal(); break;
      case 'save-manager': html = UI.buildSaveManagerModal(); break;
    }

    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // 绑定事件
    if (type === 'buy-gpu') UI.bindBuyGPUEvents();
    else if (type === 'demolish-gpu') UI.bindDemolishGPUEvents();
    else if (type === 'expand-power') UI.bindExpandPowerEvents();
    else if (type === 'expand-cooling') UI.bindExpandCoolingEvents();
    else if (type === 'expand-datacenter') UI.bindExpandDatacenterEvents();
    else if (type === 'collect-data') UI.bindCollectDataEvents();
    else if (type === 'new-training') UI.bindTrainingEvents();
    else if (type === 'hire-researcher') UI.bindHireResearcherEvents();
    else if (type === 'research') UI.bindResearchEvents();
    else if (type === 'save-manager') UI.bindSaveManagerEvents();
  },

  hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },

  showDeleteConfirm() {
    const html = '<h2 class="text-lg font-bold text-danger mb-3">删除存档</h2>' +
      '<div class="text-sm text-muted mb-4">确定要删除当前存档吗？只有当前存档会被删除，其他存档不会受到影响。</div>' +
      '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button onclick="UI.hideModal();SaveSystem.delete()" class="modal-btn" style="border-color:#e74c3c;color:#e74c3c">确认删除</button>' +
      '</div>';
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  buildSaveManagerModal() {
    const slots = SaveSystem.getSlots();
    let html = '<h2 class="text-lg font-bold text-accent mb-3">存档管理</h2>';
    html += '<div class="text-xs text-muted mb-3">自动存档和手动保存都会写入当前存档。可把当前进度另存为新的存档槽。</div>';
    html += '<div class="flex gap-2 mb-3"><input id="new-save-name" class="modal-input flex-1" maxlength="30" placeholder="新存档名称（例如：MoE 路线）"><button id="create-save-slot" class="modal-btn primary">另存为</button></div>';
    html += '<div class="space-y-1">';
    for (const slot of slots) {
      const active = slot.id === SaveSystem.currentSlotId;
      html += '<div class="border border-border rounded p-2 text-xs"><div class="flex justify-between gap-2"><div><div class="font-bold">' + slot.name + (active ? ' <span class="text-accent">（当前）</span>' : '') + '</div><div class="text-muted mt-0.5">第 ' + slot.day + ' 天｜$' + Economy.formatMoney(slot.cash) + '｜' + new Date(slot.timestamp).toLocaleString('zh-CN') + '</div></div><div class="flex gap-1 items-start">' +
        (active ? '' : '<button class="text-accent save-switch" data-slot="' + slot.id + '">切换</button>') +
        '<button class="text-danger save-delete" data-slot="' + slot.id + '">删除</button></div></div></div>';
    }
    html += '</div><div class="flex justify-end mt-3"><button onclick="UI.hideModal()" class="modal-btn">关闭</button></div>';
    return html;
  },

  bindSaveManagerEvents() {
    document.getElementById('create-save-slot').addEventListener('click', () => {
      const input = document.getElementById('new-save-name');
      const name = input.value.trim() || (Game.state.companyName + ' · 存档');
      SaveSystem.createSlot(name);
      UI.toast('已创建新存档，后续保存将写入该存档');
      document.getElementById('modal-content').innerHTML = UI.buildSaveManagerModal();
      UI.bindSaveManagerEvents();
    });
    document.querySelectorAll('.save-switch').forEach(button => button.addEventListener('click', () => {
      localStorage.setItem(SaveSystem.LAST_SLOT_KEY, button.dataset.slot);
      window.location.reload();
    }));
    document.querySelectorAll('.save-delete').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.slot;
      const active = id === SaveSystem.currentSlotId;
      if (!confirm(active ? '删除当前存档并返回开始页？' : '删除这个存档？')) return;
      SaveSystem.delete(id);
      if (!active) {
        document.getElementById('modal-content').innerHTML = UI.buildSaveManagerModal();
        UI.bindSaveManagerEvents();
      }
    }));
  },

  showBankruptcyModal() {
    const html = '<h2 class="text-lg font-bold text-danger mb-3">公司破产</h2>' +
      '<div class="text-sm text-muted mb-2">' + Game.state.companyName + ' 已因资金链断裂而破产。</div>' +
      '<div class="text-xs text-muted mb-2">运营天数: ' + Game.state.day + ' | 最终估值: $' + Economy.formatMoney(Game.state.valuation) + '</div>' +
      '<div class="text-xs text-muted mb-4">所有资产将被清算，存档将被删除。</div>' +
      '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal();SaveSystem.delete()" class="modal-btn" style="border-color:#e74c3c;color:#e74c3c">确认破产</button>' +
      '</div>';
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  // === 部署模型模态框 ===
  _pendingModel: null,

  showDeployModelModal(model) {
    UI._pendingModel = model;
    const s = Game.state;
    const recInference = recommendedInferenceGPUs(model.params);
    const scoreColor = model.score >= 70 ? '#00cc66' : model.score >= 50 ? '#e6a817' : '#e74c3c';

    let html = '<h2 class="text-lg font-bold text-accent mb-2">部署模型</h2>';
    html += '<div class="bg-[#111118] rounded p-3 mb-3">';
    html += '<div class="flex justify-between items-center">';
    html += '<span class="font-bold text-sm">' + model.name + '</span>';
    html += '<span class="font-mono text-base" style="color:' + scoreColor + '">' + model.score.toFixed(1) + '</span>';
    html += '</div>';
    html += '<div class="text-xs text-muted mt-0.5">参数 ' + model.label + ' | ' + (model.openSource ? '开源' : '闭源') + '</div>';
    html += '<div class="text-xs text-muted mt-1">最少 ' + recInference + ' GPU (以H100计, 低算力型号需更多)</div>';
    html += '</div>';

    // GPU选择
    const trainingAlloc = Game.getTrainingGPUAllocation();
    const inferenceAlloc = Game.getInferenceGPUAllocation();
    html += '<div class="text-xs mb-1">选择部署GPU型号及数量 (每型号最少需求已按算力折算):</div>';
    html += '<div class="grid grid-cols-1 gap-1 mb-2" id="deploy-gpu-grid">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const owned = s.gpuInventory[key] || 0;
      const trainingUsed = trainingAlloc[key] || 0;
      const inferenceUsed = inferenceAlloc[key] || 0;
      const avail = Math.max(0, owned - trainingUsed - inferenceUsed);
      const recType = recommendedInferenceGPUsForType(model.params, key);
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      html += '<div class="flex items-center gap-2 p-1 border border-border rounded text-xs' + (owned === 0 ? ' opacity-40' : '') + '">' +
        '<span class="inline-block w-2 h-2 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold w-16">' + key + '</span>' +
        '<span class="text-muted flex-1">' + gpu.tflops + ' TFLOPS</span>' +
        '<span class="text-muted">可用 ' + avail + '/' + owned + '</span>' +
        '<span class="text-accent" title="最少推理数">最少' + recType + '</span>' +
        '<input type="number" class="modal-input w-16 deploy-gpu-input" data-gpu="' + key + '" data-max="' + avail + '" value="' + Math.min(recType, avail) + '" min="0" max="' + avail + '"' + (owned === 0 ? ' disabled' : '') + '>' +
        '</div>';
    }
    html += '</div>';
    html += '<div class="text-xs mb-3">已分配: <span id="deploy-gpu-total" class="font-mono text-accent">0</span> GPU | 等效 H100: <span id="deploy-gpu-equivalent" class="font-mono text-accent">0.0</span>/<span class="font-mono">' + recInference + '</span><div class="text-muted mt-1">不同型号可混用，按 TFLOPS 折算为 H100 等效；部署不得低于最低等效量。</div></div>';

    html += '<div class="flex gap-2 justify-end">';
    html += '<button onclick="UI.skipDeploy()" class="modal-btn">暂不部署</button>';
    html += '<button id="confirm-deploy" class="modal-btn primary">部署模型</button>';
    html += '</div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    // 绑定事件
    const updateDeployStats = () => {
      let total = 0;
      let equivalent = 0;
      document.querySelectorAll('.deploy-gpu-input').forEach(inp => {
        const v = Math.max(0, parseInt(inp.value) || 0);
        const max = parseInt(inp.dataset.max) || 0;
        if (v > max) { inp.value = max; }
        const actual = Math.min(v, max);
        total += actual;
        equivalent += actual * gpuToH100Rate(inp.dataset.gpu);
      });
      document.getElementById('deploy-gpu-total').textContent = total;
      document.getElementById('deploy-gpu-equivalent').textContent = equivalent.toFixed(1);
    };
    document.querySelectorAll('.deploy-gpu-input').forEach(inp => {
      inp.addEventListener('input', updateDeployStats);
    });
    updateDeployStats();

    document.getElementById('confirm-deploy').addEventListener('click', () => {
      const deploymentGPUs = {};
      let total = 0;
      document.querySelectorAll('.deploy-gpu-input').forEach(inp => {
        const v = Math.max(0, parseInt(inp.value) || 0);
        if (v > 0) {
          deploymentGPUs[inp.dataset.gpu] = v;
          total += v;
        }
      });
      if (total === 0) {
        UI.toast('请至少分配1张GPU用于推理');
        return;
      }
      if (!Game.meetsModelInferenceMinimum(UI._pendingModel, deploymentGPUs)) {
        UI.toast('GPU 等效算力不足，至少需要 ' + recInference + ' 张 H100 等效算力');
        return;
      }
      // 部署模型
      const modelName = UI._pendingModel.name;
      UI._pendingModel.deployed = true;
      UI._pendingModel.deploymentGPUs = deploymentGPUs;
      Game.state.deployedModels.push(UI._pendingModel);
      UI._pendingModel = null;
      UI.hideModal();
      Game.addLog('模型 ' + modelName + ' 已部署，推理占用 ' + total + ' GPU');
      UI.toast('模型已部署! 推理占用 ' + total + ' GPU');

      // 部署后检查供电（推理负载上升可能超载）
      if (Game.getTotalPowerMW() > Game.state.powerCapacityMW) {
        Game.state.blackoutDays = 3;
        Game.addLog('警告: 部署后功耗超载! 供电不足，开始断电!');
        UI.toast('功耗超载! 断电3天!');
      }
      UI.update();
    });
  },

  // 已部署模型可随时增加、削减或替换 GPU；只要混合型号的 H100 等效量不低于下限。
  showAdjustDeploymentModal(index) {
    const s = Game.state;
    const model = s.deployedModels[index];
    if (!model) return;
    const minimum = Game.getModelMinimumInferenceH100(model);
    const trainingAlloc = Game.getTrainingGPUAllocation();
    const otherAlloc = {};
    s.deployedModels.forEach((item, i) => {
      if (i === index || !item.deployed) return;
      for (const [type, count] of Object.entries(item.deploymentGPUs || {})) {
        if (CONFIG.GPUS[type]) otherAlloc[type] = (otherAlloc[type] || 0) + count;
      }
    });

    let html = '<h2 class="text-lg font-bold text-accent mb-2">调配模型 GPU</h2>';
    html += '<div class="text-xs text-muted mb-3"><span class="text-white font-bold">' + model.name + '</span>：最低需要 <span class="text-amber font-mono">' + minimum + ' H100 等效</span>。可减少、增加或混合替换型号。</div>';
    html += '<div class="grid grid-cols-1 gap-1 mb-2">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const owned = s.gpuInventory[key] || 0;
      const max = Math.max(0, owned - (trainingAlloc[key] || 0) - (otherAlloc[key] || 0));
      const current = Math.min(max, (model.deploymentGPUs || {})[key] || 0);
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      html += '<div class="flex items-center gap-2 p-1 border border-border rounded text-xs' + (owned === 0 ? ' opacity-40' : '') + '">' +
        '<span class="inline-block w-2 h-2 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold w-16">' + key + '</span>' +
        '<span class="text-muted flex-1">1 张 = ' + gpuToH100Rate(key).toFixed(2) + ' H100</span>' +
        '<span class="text-muted">可用 ' + max + '/' + owned + '</span>' +
        '<input type="number" class="modal-input w-16 adjust-deploy-input" data-gpu="' + key + '" data-max="' + max + '" value="' + current + '" min="0" max="' + max + '"' + (owned === 0 ? ' disabled' : '') + '>' +
        '</div>';
    }
    html += '</div>';
    html += '<div class="text-xs mb-3">GPU 数量: <span id="adjust-gpu-total" class="font-mono text-accent">0</span> | 等效 H100: <span id="adjust-gpu-equivalent" class="font-mono text-accent">0.0</span>/<span class="font-mono">' + minimum + '</span></div>';
    html += '<div class="flex gap-2 justify-end"><button onclick="UI.hideModal()" class="modal-btn">取消</button><button id="confirm-adjust-deploy" class="modal-btn primary">保存调配</button></div>';
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    const readAllocation = () => {
      const allocation = {};
      let total = 0;
      let equivalent = 0;
      document.querySelectorAll('.adjust-deploy-input').forEach(inp => {
        const max = parseInt(inp.dataset.max) || 0;
        const value = Math.max(0, Math.min(max, parseInt(inp.value) || 0));
        inp.value = value;
        if (value > 0) allocation[inp.dataset.gpu] = value;
        total += value;
        equivalent += value * gpuToH100Rate(inp.dataset.gpu);
      });
      document.getElementById('adjust-gpu-total').textContent = total;
      document.getElementById('adjust-gpu-equivalent').textContent = equivalent.toFixed(1);
      return allocation;
    };
    document.querySelectorAll('.adjust-deploy-input').forEach(inp => inp.addEventListener('input', readAllocation));
    readAllocation();
    document.getElementById('confirm-adjust-deploy').addEventListener('click', () => {
      const allocation = readAllocation();
      if (!Game.meetsModelInferenceMinimum(model, allocation)) {
        UI.toast('不能低于最低部署量：需要 ' + minimum + ' 张 H100 等效算力');
        return;
      }
      model.deploymentGPUs = allocation;
      Game.addLog('调配模型 ' + model.name + ' 的推理 GPU（' + effectiveInferenceGPUs(allocation).toFixed(1) + ' H100 等效）');
      if (Game.getTotalPowerMW() > s.powerCapacityMW) {
        s.blackoutDays = 3;
        Game.addLog('警告: GPU 调配后功耗超载! 供电不足，开始断电!');
        UI.toast('调配完成，但功耗超载! 断电3天!');
      } else {
        UI.toast('GPU 调配已保存');
      }
      UI.hideModal();
      UI.update();
    });
  },

  skipDeploy() {
    if (UI._pendingModel) {
      Game.addLog(UI._pendingModel.name + ' 暂未部署 (可在产品面板中部署)');
      UI._pendingModel = null;
    }
    UI.hideModal();
  },

  // === 购买GPU模态框 ===
  buildBuyGPUModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">购买 GPU 机架</h2>';
    html += '<p class="text-xs text-muted mb-3">1 Rack = 8 GPU | 部分型号需达到指定天数后解锁</p>';

    if (s.buyBanDays > 0) {
      html += '<div class="text-danger text-sm mb-3">芯片禁运中，剩余 ' + s.buyBanDays + ' 天</div>';
    }

    html += '<div class="grid grid-cols-2 gap-2 mb-3">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      const locked = s.valuation < gpu.unlockValuation;
      const lockedClass = locked ? 'locked' : '';
      const lockedHtml = locked
        ? '<div class="text-xs text-danger mt-1">市值 $' + Economy.formatMoney(gpu.unlockValuation) + ' 解锁</div>'
        : '<div class="text-xs text-accent mt-1">$' + Economy.formatMoney(gpu.price) + ' / GPU</div>';
      html += '<div class="gpu-option p-2 border border-border rounded ' + (locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-accent') + ' ' + lockedClass + '" data-gpu="' + key + '" data-locked="' + locked + '">' +
        '<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold text-sm">' + gpu.name + '</span></div>' +
        '<div class="text-xs text-muted mt-1">' + gpu.arch + ' | ' + gpu.tflops + ' TFLOPS</div>' +
        '<div class="text-xs text-muted">' + gpu.vram + 'GB ' + gpu.vram_type + ' | ' + gpu.power + 'W</div>' +
        lockedHtml +
        '</div>';
    }
    html += '</div>';

    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">机架数量:</span>' +
      '<input id="gpu-racks" type="number" class="modal-input w-24" value="10" min="1" max="1000">' +
      '<span class="text-xs text-muted">(= <span id="gpu-count">80</span> GPU)</span>' +
      '</div>';

    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="gpu-cost" class="text-accent">$0</span></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-buy" class="modal-btn primary">确认购买</button>' +
      '</div>';

    return html;
  },

  bindBuyGPUEvents() {
    let selectedGpu = 'A100';
    const updateCost = () => {
      const racks = parseInt(document.getElementById('gpu-racks').value) || 0;
      const gpu = CONFIG.GPUS[selectedGpu];
      document.getElementById('gpu-count').textContent = racks * 8;
      document.getElementById('gpu-cost').textContent = '$' + Economy.formatMoney(racks * 8 * gpu.price);
    };

    document.querySelectorAll('.gpu-option').forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.locked === 'true') {
          UI.toast(CONFIG.GPUS[el.dataset.gpu].name + ' 尚未解锁，需提升市值');
          return;
        }
        document.querySelectorAll('.gpu-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedGpu = el.dataset.gpu;
        updateCost();
      });
    });

    // 默认选中第一个已解锁的GPU
    const firstUnlocked = document.querySelector('.gpu-option[data-locked="false"]');
    if (firstUnlocked) {
      firstUnlocked.classList.add('border-accent', 'bg-accent/5');
      selectedGpu = firstUnlocked.dataset.gpu;
    }

    document.getElementById('gpu-racks').addEventListener('input', updateCost);
    updateCost();

    document.getElementById('confirm-buy').addEventListener('click', () => {
      const racks = parseInt(document.getElementById('gpu-racks').value) || 0;
      if (racks <= 0) return;
      Economy.buyGPUs(selectedGpu, racks);
      UI.hideModal();
    });
  },

  // === 拆除GPU模态框 ===
  buildDemolishGPUModal() {
    const s = Game.state;
    const trainingAlloc = Game.getTrainingGPUAllocation();
    const inferenceAlloc = Game.getInferenceGPUAllocation();
    let html = '<h2 class="text-lg font-bold text-accent mb-3">拆除 GPU</h2>';
    html += '<p class="text-xs text-muted mb-2">选择要拆除的GPU型号和数量，拆除返还50%购买价</p>';
    html += '<p class="text-xs text-amber mb-3">训练中/推理中的GPU不可拆除，需先放弃训练或下架模型</p>';

    html += '<div class="grid grid-cols-2 gap-2 mb-3">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const count = s.gpuInventory[key] || 0;
      const used = (trainingAlloc[key] || 0) + (inferenceAlloc[key] || 0);
      const avail = Math.max(0, count - used);
      const refund = Math.floor(gpu.price * 0.5);
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      const disabled = avail === 0;
      html += '<div class="demolish-option p-2 border border-border rounded cursor-pointer hover:border-danger ' + (disabled ? 'opacity-40 pointer-events-none' : '') + '" data-gpu="' + key + '">' +
        '<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold text-sm">' + gpu.name + '</span></div>' +
        '<div class="text-xs text-muted">可拆: ' + avail + '/' + count + ' 张' + (used > 0 ? ' <span class="text-amber">(占用' + used + ')</span>' : '') + ' | 返还 $' + Economy.formatMoney(refund) + '/张</div>' +
        '</div>';
    }
    html += '</div>';

    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">拆除数量:</span>' +
      '<input id="demolish-qty" type="number" class="modal-input w-24" value="0" min="0">' +
      '<span class="text-xs text-muted">张 GPU</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计返还: <span id="demolish-refund" class="text-accent">$0</span></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-demolish" class="modal-btn danger">确认拆除</button>' +
      '</div>';

    return html;
  },

  bindDemolishGPUEvents() {
    let selectedGpu = null;
    let maxQty = 0;

    const updateRefund = () => {
      const qty = parseInt(document.getElementById('demolish-qty').value) || 0;
      const clampedQty = Math.min(qty, maxQty);
      if (qty !== clampedQty) document.getElementById('demolish-qty').value = clampedQty;
      if (selectedGpu) {
        const refund = Math.floor(CONFIG.GPUS[selectedGpu].price * 0.5);
        document.getElementById('demolish-refund').textContent = '$' + Economy.formatMoney(clampedQty * refund);
      } else {
        document.getElementById('demolish-refund').textContent = '$0';
      }
    };

    document.querySelectorAll('.demolish-option:not(.opacity-40)').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.demolish-option').forEach(e => e.classList.remove('border-danger', 'bg-danger/5'));
        el.classList.add('border-danger', 'bg-danger/5');
        selectedGpu = el.dataset.gpu;
        // 可拆除数量 = 总库存 - 训练占用 - 推理占用
        const s = Game.state;
        const trainingAlloc = Game.getTrainingGPUAllocation();
        const inferenceAlloc = Game.getInferenceGPUAllocation();
        const total = s.gpuInventory[selectedGpu] || 0;
        const used = (trainingAlloc[selectedGpu] || 0) + (inferenceAlloc[selectedGpu] || 0);
        maxQty = Math.max(0, total - used);
        document.getElementById('demolish-qty').max = maxQty;
        updateRefund();
      });
    });

    document.getElementById('demolish-qty').addEventListener('input', updateRefund);

    document.getElementById('confirm-demolish').addEventListener('click', () => {
      if (!selectedGpu) return;
      const qty = parseInt(document.getElementById('demolish-qty').value) || 0;
      const clampedQty = Math.min(qty, maxQty);
      if (clampedQty <= 0) return;
      Economy.demolishGPUs(selectedGpu, clampedQty);
      UI.hideModal();
    });
  },

  // === 扩容供电模态框 ===
  buildExpandPowerModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">扩容供电</h2>';
    html += '<div class="text-xs text-muted mb-3">当前容量: ' + s.powerCapacityMW + 'MW | 扩容成本: $' + Economy.formatMoney(CONFIG.POWER_EXPAND_COST_PER_MW) + ' / MW</div>';
    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">扩容:</span>' +
      '<input id="power-mw" type="number" class="modal-input w-24" value="5" min="1" max="100">' +
      '<span class="text-xs text-muted">MW</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="power-cost" class="text-accent">$250M</span></div>';
    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-power" class="modal-btn primary">确认扩容</button>' +
      '</div>';
    return html;
  },

  bindExpandPowerEvents() {
    const updateCost = () => {
      const mw = parseInt(document.getElementById('power-mw').value) || 0;
      document.getElementById('power-cost').textContent = '$' + Economy.formatMoney(mw * CONFIG.POWER_EXPAND_COST_PER_MW);
    };
    document.getElementById('power-mw').addEventListener('input', updateCost);
    document.getElementById('confirm-power').addEventListener('click', () => {
      const mw = parseInt(document.getElementById('power-mw').value) || 0;
      if (mw <= 0) return;
      Economy.expandPower(mw);
      UI.hideModal();
    });
  },

  // === 扩容冷却模态框 ===
  buildExpandCoolingModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">扩容冷却系统</h2>';
    html += '<div class="text-xs text-muted mb-3">当前容量: ' + s.coolingCapacityMW + 'MW | 扩容成本: $' + Economy.formatMoney(CONFIG.COOLING_EXPAND_COST_PER_MW) + ' / MW</div>';
    html += '<div class="flex items-center gap-2 mb-3">' +
      '<span class="text-xs text-muted">扩容:</span>' +
      '<input id="cooling-mw" type="number" class="modal-input w-24" value="2" min="1" max="100">' +
      '<span class="text-xs text-muted">MW</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="cooling-cost" class="text-accent">$40M</span></div>';
    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-cooling" class="modal-btn primary">确认扩容</button>' +
      '</div>';
    return html;
  },

  bindExpandCoolingEvents() {
    const updateCost = () => {
      const mw = parseInt(document.getElementById('cooling-mw').value) || 0;
      document.getElementById('cooling-cost').textContent = '$' + Economy.formatMoney(mw * CONFIG.COOLING_EXPAND_COST_PER_MW);
    };
    document.getElementById('cooling-mw').addEventListener('input', updateCost);
    document.getElementById('confirm-cooling').addEventListener('click', () => {
      const mw = parseInt(document.getElementById('cooling-mw').value) || 0;
      if (mw <= 0) return;
      Economy.expandCooling(mw);
      UI.hideModal();
    });
  },

  // === 扩容机房模态框 ===
  buildExpandDatacenterModal() {
    const s = Game.state;
    const nextCost = CONFIG.DATACENTER_EXPAND_BASE_COST * Math.pow(CONFIG.DATACENTER_EXPAND_EXPONENT, s.datacenterExpands);
    const currentRows = Datacenter.ROWS;
    const currentCols = Datacenter.COLS;
    const preview = Datacenter.getExpansionPreview();
    const currentSlots = preview.currentSlots;
    const newRows = preview.rows;
    const newCols = preview.cols;
    const newSlots = preview.slots;

    let html = '<h2 class="text-lg font-bold text-accent mb-3">扩容数据中心</h2>';
    html += '<div class="text-xs text-muted mb-2">模块化扩建：每次增加 ' + CONFIG.DATACENTER_EXPAND_ROWS + ' 行 × ' + CONFIG.DATACENTER_EXPAND_COLS + ' 列；新增容量会随现有规模增长，费用逐次递增</div>';
    html += '<div class="bg-[#111118] rounded p-3 mb-3 text-xs">';
    html += '<div class="grid grid-cols-2 gap-1">';
    html += '<span class="text-muted">当前规模</span><span class="font-mono">' + currentRows + ' x ' + currentCols + ' (' + currentSlots + ' 机架)</span>';
    html += '<span class="text-muted">扩容后</span><span class="font-mono text-accent">' + newRows + ' x ' + newCols + ' (' + newSlots + ' 机架)</span>';
    html += '<span class="text-muted">本次新增</span><span class="font-mono text-accent">+' + preview.addedSlots + ' 个 GPU 位</span>';
    html += '<span class="text-muted">已扩容次数</span><span class="font-mono">' + s.datacenterExpands + ' 次</span>';
    html += '</div></div>';
    html += '<div class="text-sm mb-3">本次扩容费用: <span id="datacenter-cost" class="text-accent font-bold">$' + Economy.formatMoney(nextCost) + '</span></div>';
    if (s.cash < nextCost) {
      html += '<div class="text-danger text-xs mb-3">资金不足! 还差 $' + Economy.formatMoney(nextCost - s.cash) + '</div>';
    }
    html += '<div class="text-xs text-muted mb-3">下次扩容费用: $' + Economy.formatMoney(CONFIG.DATACENTER_EXPAND_BASE_COST * Math.pow(CONFIG.DATACENTER_EXPAND_EXPONENT, s.datacenterExpands + 1)) + '</div>';
    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-expand-dc" class="modal-btn primary" ' + (s.cash < nextCost ? 'disabled' : '') + '>确认扩容</button>' +
      '</div>';
    return html;
  },

  bindExpandDatacenterEvents() {
    document.getElementById('confirm-expand-dc').addEventListener('click', () => {
      Economy.expandDatacenter();
      UI.hideModal();
    });
  },

  // === 数据采集模态框 ===
  _selectedDataSource: 'web_crawl',

  buildCollectDataModal() {
    const stats = DataCollection.getStats();
    const effectiveQuality = DataCollection.getEffectiveQuality();
    // 统一质量颜色阈值：>=0.85 绿, >=0.75 琥珀, >=0.60 浅琥珀, <0.60 红
    const qualityLabel = effectiveQuality >= 0.85 ? '极高' : effectiveQuality >= 0.75 ? '良好' : effectiveQuality >= 0.60 ? '一般' : '低';
    const qualityColor = effectiveQuality >= 0.85 ? '#00cc66' : effectiveQuality >= 0.75 ? '#e6a817' : effectiveQuality >= 0.60 ? '#e8a838' : '#e74c3c';
    const s = Game.state;

    let html = '<h2 class="text-lg font-bold text-accent mb-3">采集训练数据</h2>';
    html += '<div class="text-xs text-muted mb-3">数据是大模型的基石。从不同来源采集数据，质量越高训练效果越好，但成本也越高。<br>建议训练前采集 50B+ tokens 数据。</div>';

    // 数据总览面板
    html += '<div class="bg-[#111118] rounded p-3 mb-3">';
    html += '<div class="grid grid-cols-2 gap-2 text-xs">';
    html += '<div><span class="text-muted">已采总量</span><div class="font-mono text-accent text-base">' + stats.totalTokens + 'B tokens</div></div>';
    html += '<div><span class="text-muted">平均质量</span><div class="font-mono text-base" style="color:' + qualityColor + '">' + qualityLabel + ' (' + (effectiveQuality * 100).toFixed(0) + '%)</div></div>';
    html += '</div>';
    // 质量进度条
    html += '<div class="progress-bar mt-2"><div class="progress-fill" style="width:' + (effectiveQuality * 100) + '%;background:' + qualityColor + '"></div></div>';
    html += '</div>';

    // 数据源列表
    html += '<div class="text-xs text-muted uppercase mb-1">数据源 (点击选择)</div>';
    html += '<div class="grid grid-cols-2 gap-2 mb-3">';
    const selectedSrc = UI._selectedDataSource || 'web_crawl';
    for (const [key, src] of Object.entries(CONFIG.DATA_SOURCES)) {
      const current = DataCollection.state.sources[key] || 0;
      // 统一质量颜色阈值
      const qColor = src.qualityBase >= 0.85 ? '#00cc66' : src.qualityBase >= 0.75 ? '#e6a817' : src.qualityBase >= 0.60 ? '#e8a838' : '#e74c3c';
      const hasData = current > 0;
      const isSelected = key === selectedSrc;
      // 选中状态: 亮绿边框+高亮背景; 已采集: 绿边框+淡绿背景; 默认: 灰边框
      let borderColor, bgColor;
      if (isSelected) {
        borderColor = '#00ff88';
        bgColor = 'rgba(0,255,136,0.15)';
      } else if (hasData) {
        borderColor = '#00cc66';
        bgColor = 'rgba(0,204,102,0.05)';
      } else {
        borderColor = '#333';
        bgColor = 'transparent';
      }
      html += '<div class="data-source-option p-2 border rounded cursor-pointer text-xs" style="border-color:' + borderColor + ';background:' + bgColor + ';border-width:2px" data-source="' + key + '">' +
        '<div class="flex justify-between items-center"><span class="font-bold">' + src.name + '</span>' +
        '<span style="font-size:10px;padding:1px 6px;border:1px solid ' + qColor + ';color:' + qColor + ';border-radius:3px">' + src.category + '</span></div>' +
        '<div class="text-muted mt-0.5">' + src.desc + '</div>' +
        '<div class="flex justify-between mt-1">' +
        '<span style="color:' + qColor + '">质量 ' + (src.qualityBase * 100).toFixed(0) + '%</span>' +
        '<span class="text-muted">$' + Economy.formatMoney(src.cost) + '/10B</span>' +
        '</div>' +
        (hasData ? '<div class="mt-0.5 font-mono" style="color:#00cc66">已采: ' + current + 'B</div>' : '') +
        '</div>';
    }
    html += '</div>';

    // 采集数量
    html += '<div class="flex items-center gap-2 mb-2">' +
      '<span class="text-xs text-muted">采集数量:</span>' +
      '<input id="data-tokens" type="number" class="modal-input w-24" value="10" min="1" max="100">' +
      '<span class="text-xs text-muted">B tokens</span>' +
      '</div>';
    html += '<div class="text-xs text-muted mb-3">预计花费: <span id="data-cost" class="text-accent">$0</span></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">关闭</button>' +
      '<button id="confirm-collect" class="modal-btn primary">确认采集</button>' +
      '</div>';

    return html;
  },

  bindCollectDataEvents() {
    const updateCost = () => {
      const tokensB = parseInt(document.getElementById('data-tokens').value) || 0;
      const src = CONFIG.DATA_SOURCES[UI._selectedDataSource];
      if (src) {
        document.getElementById('data-cost').textContent = '$' + Economy.formatMoney(src.cost * (tokensB / 10));
      }
    };

    const updateSelectionVisual = (selectedKey) => {
      document.querySelectorAll('.data-source-option').forEach(el => {
        const key = el.dataset.source;
        const current = DataCollection.state.sources[key] || 0;
        const hasData = current > 0;
        const isSelected = key === selectedKey;
        let borderColor, bgColor;
        if (isSelected) {
          borderColor = '#00ff88';
          bgColor = 'rgba(0,255,136,0.15)';
        } else if (hasData) {
          borderColor = '#00cc66';
          bgColor = 'rgba(0,204,102,0.05)';
        } else {
          borderColor = '#333';
          bgColor = 'transparent';
        }
        el.style.borderColor = borderColor;
        el.style.backgroundColor = bgColor;
      });
    };

    document.querySelectorAll('.data-source-option').forEach(el => {
      el.addEventListener('click', () => {
        UI._selectedDataSource = el.dataset.source;
        updateSelectionVisual(UI._selectedDataSource);
        updateCost();
      });
    });
    updateSelectionVisual(UI._selectedDataSource);

    document.getElementById('data-tokens').addEventListener('input', updateCost);
    updateCost();

    document.getElementById('confirm-collect').addEventListener('click', () => {
      const tokensB = parseInt(document.getElementById('data-tokens').value) || 0;
      if (tokensB <= 0) return;
      DataCollection.buySource(UI._selectedDataSource, tokensB);
      // 刷新模态框（保留选中的数据源）
      document.getElementById('modal-content').innerHTML = UI.buildCollectDataModal();
      UI.bindCollectDataEvents();
    });
  },

  // === 新建训练模态框 ===
  buildTrainingModal() {
    const s = Game.state;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">新建训练任务</h2>';
    html += '<div class="text-xs text-muted mb-2">支持并行训练；可用 GPU 已自动扣除其它训练与已部署模型的占用。</div>';

    // 模型名称
    html += '<div class="mb-3"><label class="text-xs text-muted">模型名称</label>' +
      '<input id="train-name" type="text" class="modal-input" value="Model-' + s.day + '" maxlength="20"></div>';

    // 模型参数（自由滑动条）
    html += '<div class="mb-3"><label class="text-xs text-muted">模型参数规模</label>' +
      '<div class="mt-2 mb-1 flex items-center gap-3">' +
      '<input id="train-params-slider" type="range" min="' + CONFIG.PARAMS_MIN_B + '" max="' + CONFIG.PARAMS_MAX_B + '" step="1" value="70" class="scale-slider flex-1">' +
      '<span id="train-params-label" class="text-xs font-bold text-accent whitespace-nowrap">70B</span>' +
      '</div>' +
      '<div class="relative h-4 text-[10px] text-muted mt-1">' +
      '<span class="absolute left-0">1B</span>' +
      '<span class="absolute -translate-x-1/2" style="left:25%">500B</span>' +
      '<span class="absolute -translate-x-1/2" style="left:50%">1T</span>' +
      '<span class="absolute right-0">2T</span>' +
      '</div>' +
      '<div id="train-params-info" class="text-xs text-muted mt-1">参数 70B | 训练数据 1.4T tokens | 最少推理 14 GPU</div>' +
      '</div>';

    // 数据质量
    html += '<div class="mb-3"><label class="text-xs text-muted">数据状态</label>' +
      '<div class="text-xs text-accent mt-1">' + DataCollection.getStats().totalTokens + 'B tokens | 质量: ' + DataCollection.getEffectiveQualityLabel() + '</div>' +
      '<div class="text-xs text-muted">(通过"采集数据"按钮收集训练数据)</div></div>';

    // GPU 分配（按型号选择，最少需求按算力折算）
    const inferenceAlloc = Game.getInferenceGPUAllocation();
    html += '<div class="mb-2 text-xs">选择训练GPU型号及数量 (每型号最少需求已按算力折算):</div>';
    html += '<div class="grid grid-cols-1 gap-1 mb-2" id="gpu-alloc-grid">';
    for (const [key, gpu] of Object.entries(CONFIG.GPUS)) {
      const owned = s.gpuInventory[key] || 0;
      const inferenceUsed = inferenceAlloc[key] || 0;
      const avail = Math.max(0, owned - inferenceUsed);
      const recType = recommendedInferenceGPUsForType(70e9, key);
      const defaultVal = Math.min(recType, avail);
      const colorHex = '#' + gpu.color.toString(16).padStart(6, '0');
      html += '<div class="flex items-center gap-2 p-1 border border-border rounded text-xs' + (owned === 0 ? ' opacity-40' : '') + '">' +
        '<span class="inline-block w-2 h-2 rounded-full" style="background:' + colorHex + '"></span>' +
        '<span class="font-bold w-16">' + key + '</span>' +
        '<span class="text-muted flex-1">' + gpu.tflops + ' TFLOPS | ' + (gpu.power / 1000) + 'kW</span>' +
        '<span class="text-muted">可用 ' + avail + '/' + owned + '</span>' +
        '<span class="text-accent" id="rec-' + key + '" title="最少训练数">最少' + recType + '</span>' +
        '<input type="number" class="modal-input w-16 gpu-alloc-input" data-gpu="' + key + '" data-max="' + avail + '" data-auto="' + defaultVal + '" value="' + defaultVal + '" min="0" max="' + avail + '"' + (owned === 0 ? ' disabled' : '') + '>' +
        '</div>';
    }
    html += '</div>';
    html += '<div class="text-xs mb-2">已分配: <span id="train-gpu-total" class="font-mono text-accent">0</span> GPU' +
      ' | 总算力: <span id="train-tflops-total" class="font-mono text-accent">0</span> TFLOPS</div>';
    html += '<div class="text-xs text-muted mb-3">训练预估功耗: <span id="train-power-estimate" class="font-mono text-amber">0.0</span> MW | 当前实际功耗: <span class="font-mono">' + Game.getTotalPowerMW().toFixed(2) + '</span> MW / 额定 <span class="font-mono">' + Game.getRatedPowerMW().toFixed(2) + '</span> MW</div>';

    // 对齐方法
    html += '<div class="mb-3"><label class="text-xs text-muted">对齐方法</label><div class="flex gap-2 mt-1">' +
      '<div class="align-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-align="rlhf">RLHF + PPO (高成本, 高质量)</div>' +
      '<div class="align-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-align="dpo">DPO (低成本, 稳定)</div>' +
      '</div></div>';

    // 技术选择（仅显示已解锁，完全可选）
    html += '<div class="mb-3"><label class="text-xs text-muted">技术选择 (可选，不选也能训练)</label>' +
      '<div class="text-xs text-muted italic mb-1">技术提升训练效率和模型质量，但非必须。不选任何技术也可以训练基础模型。</div>' +
      '<div class="grid grid-cols-2 gap-1 mt-1" id="tech-grid">';
    for (const [key, tech] of Object.entries(CONFIG.TECH_RESEARCH)) {
      const unlocked = Research.isUnlocked(key);
      const classes = unlocked ? 'tech-card' : 'tech-card opacity-40';
      const statusText = unlocked ? '' : ' <span class="text-muted">(需研发)</span>';
      html += '<div class="' + classes + '" data-tech="' + key + '">' +
        '<div class="text-xs font-bold">' + tech.name + statusText + '</div>' +
        '<div class="text-xs text-muted">' + tech.desc + '</div>' +
        '<div class="text-xs tag ' + (tech.effBonus ? 'tag-green' : '') + (tech.qualityMod ? 'tag-amber' : '') + (tech.incomeBonus ? 'tag-green' : '') + '">' + tech.effect + '</div>' +
        '</div>';
    }
    html += '</div></div>';

    // 开源选择
    html += '<div class="mb-3"><label class="text-xs text-muted">开源策略</label><div class="flex gap-2 mt-1">' +
      '<div class="open-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-open="false">闭源 (API收入)</div>' +
      '<div class="open-option p-2 border border-border rounded cursor-pointer hover:border-accent text-xs" data-open="true">开源 (社区传播)</div>' +
      '</div></div>';

    html += '<div class="flex gap-2 justify-end">' +
      '<button onclick="UI.hideModal()" class="modal-btn">取消</button>' +
      '<button id="confirm-train" class="modal-btn primary">开始训练</button>' +
      '</div>';

    return html;
  },

  bindTrainingEvents() {
    let selectedParams = 70e9; // 默认 70B
    let selectedAlign = 'dpo';
    let selectedOpen = false;
    let selectedTechs = [];

    // 自由参数滑动条
    const slider = document.getElementById('train-params-slider');
    const paramsLabel = document.getElementById('train-params-label');
    const paramsInfo = document.getElementById('train-params-info');

    // GPU分配更新（提前定义，供滑动条联动使用）
    const updateAllocStats = () => {
      let totalGPU = 0;
      let totalTFLOPS = 0;
      let totalPower = 0;
      document.querySelectorAll('.gpu-alloc-input').forEach(inp => {
        const v = Math.max(0, parseInt(inp.value) || 0);
        const max = parseInt(inp.dataset.max) || 0;
        if (v > max) { inp.value = max; }
        const actualV = Math.min(v, max);
        const gpuKey = inp.dataset.gpu;
        const gpu = CONFIG.GPUS[gpuKey];
        if (gpu && actualV > 0) {
          totalGPU += actualV;
          totalTFLOPS += actualV * gpu.tflops;
          totalPower += actualV * gpu.power / 1_000_000;
        }
      });
      document.getElementById('train-gpu-total').textContent = totalGPU;
      document.getElementById('train-tflops-total').textContent = totalTFLOPS.toLocaleString();
      const estPower = totalPower * 0.95 * (1 + CONFIG.COOLING_RATIO);
      document.getElementById('train-power-estimate').textContent = estPower.toFixed(2);
    };

    const updateParamsDisplay = () => {
      const bValue = parseInt(slider.value);
      selectedParams = bValue * 1e9;
      const labelStr = formatParams(selectedParams);
      paramsLabel.textContent = labelStr;
      const tokens = selectedParams * CONFIG.CHINCHILLA_RATIO;
      const tokensStr = formatParams(tokens);
      const recInference = recommendedInferenceGPUs(selectedParams);
      paramsInfo.textContent = '参数 ' + labelStr + ' | 训练数据 ' + tokensStr + ' tokens | 最少 ' + recInference + ' GPU (H100)';
      // 按型号联动最少需求数（用户未手动修改时自动同步）
      document.querySelectorAll('.gpu-alloc-input').forEach(inp => {
        const key = inp.dataset.gpu;
        const rec = recommendedInferenceGPUsForType(selectedParams, key);
        const recEl = document.getElementById('rec-' + key);
        if (recEl) recEl.textContent = '最少' + rec;
        const autoVal = parseInt(inp.dataset.auto) || 0;
        if ((parseInt(inp.value) || 0) === autoVal) {
          const max = parseInt(inp.dataset.max) || 0;
          const newVal = Math.min(rec, max);
          inp.value = newVal;
          inp.dataset.auto = newVal;
        }
      });
      updateAllocStats();
    };
    slider.addEventListener('input', updateParamsDisplay);
    updateParamsDisplay();

    document.querySelectorAll('.align-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.align-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedAlign = el.dataset.align;
      });
    });
    document.querySelector('.align-option[data-align="dpo"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.open-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.open-option').forEach(e => e.classList.remove('border-accent', 'bg-accent/5'));
        el.classList.add('border-accent', 'bg-accent/5');
        selectedOpen = el.dataset.open === 'true';
      });
    });
    document.querySelector('.open-option[data-open="false"]').classList.add('border-accent', 'bg-accent/5');

    document.querySelectorAll('.tech-card:not(.opacity-40)').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.tech;
        if (selectedTechs.includes(key)) {
          selectedTechs = selectedTechs.filter(t => t !== key);
          el.classList.remove('selected');
        } else {
          selectedTechs.push(key);
          el.classList.add('selected');
        }
      });
    });

    // GPU分配更新（监听用户手动修改）
    document.querySelectorAll('.gpu-alloc-input').forEach(inp => {
      inp.addEventListener('input', updateAllocStats);
    });
    updateAllocStats();

    document.getElementById('confirm-train').addEventListener('click', () => {
      const modelName = document.getElementById('train-name').value.trim() || ('Model-' + Game.state.day);
      // 收集GPU分配
      const gpuAllocation = {};
      let totalAlloc = 0;
      document.querySelectorAll('.gpu-alloc-input').forEach(inp => {
        const v = Math.max(0, parseInt(inp.value) || 0);
        if (v > 0) {
          gpuAllocation[inp.dataset.gpu] = v;
          totalAlloc += v;
        }
      });
      if (totalAlloc <= 0) {
        UI.toast('请至少分配1张GPU用于训练');
        return;
      }

      Training.newTraining({
        modelName,
        params: selectedParams,
        alignmentMethod: selectedAlign,
        selectedTechs,
        gpuAllocation,
        openSource: selectedOpen
      });
      UI.hideModal();
    });
  },

  // === 聘请研究员模态框 ===
  buildHireResearcherModal() {
    const s = Game.state;
    const r = s.researchers;
    let html = '<h2 class="text-lg font-bold text-accent mb-3">聘请研究员</h2>';
    html += '<p class="text-xs text-muted mb-3">研究员提供训练效率加成，不同等级效果不同。每级最多5位。每30天可聘请一次。</p>';

    for (const [key, tier] of Object.entries(CONFIG.RESEARCHER_TIERS)) {
      const count = r[key] || 0;
      const full = count >= CONFIG.RESEARCHER_MAX_PER_TIER;
      const locked = s.valuation < tier.unlockValuation;
      const lockClass = locked ? 'opacity-50 cursor-not-allowed' : (full ? 'opacity-50' : 'cursor-pointer hover:border-accent');
      html += '<div class="researcher-tier p-3 border border-border rounded mb-2 ' + lockClass + '" data-tier="' + key + '" data-locked="' + locked + '">' +
        '<div class="flex justify-between items-center">' +
        '<span class="font-bold text-sm">' + tier.name + '</span>' +
        '<span class="text-xs text-muted">' + count + '/' + CONFIG.RESEARCHER_MAX_PER_TIER + '</span>' +
        '</div>' +
        '<div class="text-xs text-muted mt-1">' + tier.desc + '</div>' +
        '<div class="text-xs mt-1">' +
        '<span class="tag tag-green">训练效率 +' + (tier.effBonus * 100).toFixed(0) + '%</span>' +
        '<span class="text-muted ml-2">月薪 $' + Economy.formatMoney(tier.salary) + '</span>' +
        '</div>' +
        (locked ? '<div class="text-xs text-danger mt-1">需市值 $' + Economy.formatMoney(tier.unlockValuation) + '</div>' : '') +
        '</div>';
    }

    html += '<div class="flex gap-2 justify-end mt-3">' +
      '<button onclick="UI.hideModal()" class="modal-btn">关闭</button>' +
      '</div>';

    return html;
  },

  bindHireResearcherEvents() {
    document.querySelectorAll('.researcher-tier').forEach(el => {
      if (el.dataset.locked === 'true') {
        el.addEventListener('click', () => {
          const tier = el.dataset.tier;
          UI.toast(CONFIG.RESEARCHER_TIERS[tier].name + ' 需要市值 $' + Economy.formatMoney(CONFIG.RESEARCHER_TIERS[tier].unlockValuation) + ' 解锁');
        });
        return;
      }
      if (el.classList.contains('opacity-50')) return;
      el.addEventListener('click', () => {
        const tier = el.dataset.tier;
        Economy.hireResearcher(tier);
        document.getElementById('modal-content').innerHTML = UI.buildHireResearcherModal();
        UI.bindHireResearcherEvents();
      });
    });
  },

  // === 研发技术模态框 ===
  buildResearchModal() {
    let html = '<h2 class="text-lg font-bold text-accent mb-3">研发技术</h2>';
    const levelInfo = Research.getLevelInfo();
    html += '<div class="border border-border rounded p-2 mb-3 text-xs"><div class="flex justify-between"><span>研发等级 <span class="text-accent font-bold">Lv.' + levelInfo.level + ' · ' + levelInfo.name + '</span></span><span class="text-muted">已完成 ' + levelInfo.completed + ' 项</span></div>' +
      (levelInfo.next ? '<div class="text-muted mt-1">升级至 Lv.' + (levelInfo.level + 1) + '：还需完成 ' + Math.max(0, levelInfo.next.requiredCompleted - levelInfo.completed) + ' 项技术</div>' : '<div class="text-accent mt-1">已达到最高研发等级</div>') + '</div>';
    const techStatus = Research.getTechStatus();
    const tiers = { 1: [], 2: [], 3: [], 4: [] };

    for (const [key, tech] of Object.entries(techStatus)) {
      const tier = tech.tier || 1;
      if (!tiers[tier]) tiers[tier] = [];
      tiers[tier].push({ key, ...tech });
    }

    for (let tier = 1; tier <= 4; tier++) {
      const level = CONFIG.RESEARCH_LEVELS[tier];
      html += '<div class="mb-3"><div class="text-xs text-muted uppercase mb-1">Tier ' + tier + ' · ' + level.name + '（完成 ' + level.requiredCompleted + ' 项解锁）</div>';
      html += '<div class="grid grid-cols-2 gap-1">';
      for (const tech of tiers[tier]) {
        const status = tech.status;
        let badge = '';
        let clickable = '';
        let blockHtml = '';
        if (status === 'unlocked') {
          badge = '<span class="tag tag-green text-xs">已解锁</span>';
        } else if (status === 'researching') {
          badge = '<span class="tag tag-amber text-xs">研发中</span>';
        } else if (status === 'available') {
          badge = '<span class="tag text-xs border border-accent text-accent">可研发</span>';
          clickable = 'research-tech-option cursor-pointer hover:border-accent';
        } else {
          // 根据 blockInfo 显示不同原因
          if (tech.blockInfo) {
            if (tech.blockInfo.type === 'queue') {
              badge = '<span class="tag text-xs" style="border:1px solid #ffaa00;color:#ffaa00">队列已满</span>';
              blockHtml = '<div class="text-xs mt-0.5" style="color:#ffaa00">' + tech.blockInfo.text + ' (聘请研究员可增加并发)</div>';
            } else if (tech.blockInfo.type === 'deps') {
              badge = '<span class="tag text-xs opacity-50">需前置</span>';
              blockHtml = '<div class="text-xs text-danger mt-0.5">' + tech.blockInfo.text + '</div>';
            } else if (tech.blockInfo.type === 'level') {
              badge = '<span class="tag text-xs opacity-50">等级不足</span>';
              blockHtml = '<div class="text-xs text-amber mt-0.5">' + tech.blockInfo.text + '</div>';
            } else {
              badge = '<span class="tag text-xs opacity-50">不可研发</span>';
            }
          } else {
            badge = '<span class="tag text-xs opacity-50">需前置</span>';
          }
        }
        html += '<div class="' + clickable + ' p-2 border border-border rounded text-xs" data-tech="' + tech.key + '">' +
          '<div class="flex justify-between items-center"><span class="font-bold">' + tech.name + '</span>' + badge + '</div>' +
          '<div class="text-muted mt-0.5">' + tech.desc + '</div>' +
          '<div class="text-muted mt-0.5">' + tech.effect + ' | ' + tech.days + '天 | $' + Economy.formatMoney(tech.cost) + '</div>' +
          (tech.deps.length > 0 ? '<div class="text-muted text-xs">前置: ' + tech.deps.map(d => CONFIG.TECH_RESEARCH[d]?.name || d).join(', ') + '</div>' : '') +
          blockHtml +
          '</div>';
      }
      html += '</div></div>';
    }

    // 当前研发项目
    const researching = Research.getResearchingList();
    if (researching.length > 0) {
      html += '<div class="mb-3"><div class="text-xs text-muted uppercase mb-1">研发进度</div>';
      for (const r of researching) {
        html += '<div class="mb-1"><div class="flex justify-between text-xs"><span>' + r.name + '</span><span class="font-mono">' + r.remaining + '天</span></div>' +
          '<div class="progress-bar mt-0.5"><div class="progress-fill" style="width:' + r.progress + '%"></div></div>' +
          '<button class="text-xs text-danger mt-0.5" onclick="Research.cancelResearch(\'' + r.key + '\'); UI.hideModal();">取消研发 (返还30%)</button>' +
          '</div>';
      }
      html += '</div>';
    }

    html += '<div class="flex gap-2 justify-end mt-3">' +
      '<button onclick="UI.hideModal()" class="modal-btn">关闭</button>' +
      '</div>';

    return html;
  },

  bindResearchEvents() {
    document.querySelectorAll('.research-tech-option').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.tech;
        if (Research.startResearch(key)) {
          UI.hideModal();
        }
      });
    });
  },

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
};
