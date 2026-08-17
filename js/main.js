// Model Rush - 主入口
// 作者：mukunjin
// 仓库：https://github.com/mukunjin/model-rush
function initMain() {
  const input = document.getElementById('company-name-input');
  const errorEl = document.getElementById('company-name-error');
  const btn = document.getElementById('start-game-btn');
  const overlay = document.getElementById('startup-overlay');
  const continueSection = document.getElementById('continue-section');
  const saveInfo = document.getElementById('save-info');
  const continueBtn = document.getElementById('continue-btn');
  let modalCloseBound = false;

  function bindModalClose() {
    if (modalCloseBound) return;
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.hideModal();
    });
    modalCloseBound = true;
  }

  function renderContinueSection() {
    if (!SaveSystem.hasSave()) return;
    const info = SaveSystem.getSaveInfo();
    if (!info) return;
    saveInfo.innerHTML = '<span class="text-accent font-bold">' + info.companyName + '</span> · 第 ' + info.day + ' 天 · $' + Economy.formatMoney(info.cash);
    continueSection.classList.remove('hidden');
    continueBtn.addEventListener('click', () => continueGame());
  }

  function validateName(name) {
    const trimmed = name.trim();
    if (!trimmed) return '请输入公司名称';
    if (trimmed.length < 2) return '公司名称至少2个字符';
    return null;
  }

  function startGame() {
    const name = input.value.trim();
    const error = validateName(name);
    if (error) {
      errorEl.textContent = error;
      errorEl.classList.remove('hidden');
      return;
    }

    try {
      Game.state.companyName = name;
      document.getElementById('company-name-display').textContent = name;
      Scene.init();
      Datacenter.init();
      Research.init();
      DataCollection.init();
      UI.init();
      bindModalClose();
      Game.init();

      Game.addLog(name + ' 成立! 初始资金 $' + Economy.formatMoney(CONFIG.INITIAL_CASH));
      Game.addLog('数据中心已就绪，供电 ' + CONFIG.INITIAL_POWER_CAPACITY_MW + 'MW');
      SaveSystem.save(true);
      UI.update();
      overlay.style.display = 'none';
      // 首次开局时展示流程引导；已完成过引导的玩家不会重复打扰。
      setTimeout(() => UI.startTutorial(), 150);
    } catch (e) {
      Game.state.running = false;
      console.error('游戏初始化失败', e);
      errorEl.textContent = '初始化失败，请刷新页面后重试';
      errorEl.classList.remove('hidden');
    }
  }

  function continueGame() {
    overlay.style.display = 'none';

    Scene.init();
    Datacenter.init();

    Game.state.lastFrame = performance.now();
    Game.state.running = true;
    Game.state.elapsed = 0;
    Research.init();
    DataCollection.init();
    UI.init();

    bindModalClose();

    const loaded = SaveSystem.load();
    if (!loaded) {
      UI.toast('存档加载失败，开始新游戏');
      Game.state.companyName = '新公司';
      document.getElementById('company-name-display').textContent = '新公司';
      Game.init();
      // 没有有效存档，等同于新游戏：触发新手引导
      setTimeout(() => UI.startTutorial(), 150);
    } else {
      document.getElementById('company-name-display').textContent = Game.state.companyName;
      Game.loop(performance.now());
    }
    UI.update();
  }

  renderContinueSection();

  btn.addEventListener('click', startGame);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
    else {
      errorEl.classList.remove('hidden');
    }
  });

  // 页面关闭/刷新时自动保存
  window.addEventListener('beforeunload', () => {
    if (Game.state && Game.state.running && Game.state.companyName) {
      try { SaveSystem.save(true); } catch (e) { /* 忽略 */ }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMain, { once: true });
} else {
  initMain();
}