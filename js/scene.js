// Model Rush - Three.js 场景初始化
const Scene = {
  scene: null,
  camera: null,
  renderer: null,
  container: null,
  // 手动相机控制
  isDragging: false,
  dragStarted: false,
  prevMouse: { x: 0, y: 0 },
  spherical: { theta: Math.PI / 4, phi: Math.PI / 3, radius: 22 },
  target: new THREE.Vector3(0, 0, 0),
  // 射线检测
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  hoveredObject: null,
  lastHoverCheck: 0,
  lastRenderTime: 0,
  maxRenderFPS: 45,

  init() {
    this.container = document.getElementById('scene-container');
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    // 雾距加大到覆盖最大缩放半径(60)，避免缩放/缩窗后场景被雾吞掉而变昏暗
    this.scene.fog = new THREE.Fog(0x0a0a0f, 16, 62);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 200);
    this.updateCameraPosition();

    // 场景以大量机架为主：适度限制像素比和关闭抗锯齿，优先保持操作流畅。
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.style.touchAction = 'none'; // 移动端手势由JS处理
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGrid();
    this.setupControls();
    this.setupClickInteraction();

    window.addEventListener('resize', () => this.onResize());
  },

  setupClickInteraction() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (e) => {
      if (this.dragStarted) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 检查GPU方块
      const gpuMeshes = Datacenter.getPickableGPUMeshes();
      const intersects = this.raycaster.intersectObjects(gpuMeshes, false);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const block = Datacenter.gpuBlocks.find(b => b.blades.includes(obj));
        if (block) {
          this.showTooltip(e.clientX, e.clientY, block);
          return;
        }
      }

      // 检查供电房
      if (Datacenter.powerRoom) {
        const powerHits = this.raycaster.intersectObjects(Datacenter.powerRoom.children, true);
        if (powerHits.length > 0) {
          this.showTooltip(e.clientX, e.clientY, { type: 'powerRoom' });
          return;
        }
      }

      // 检查冷却塔
      if (Datacenter.coolingTower) {
        const coolingHits = this.raycaster.intersectObjects(Datacenter.coolingTower.children, true);
        if (coolingHits.length > 0) {
          this.showTooltip(e.clientX, e.clientY, { type: 'coolingTower' });
          return;
        }
      }

      this.hideTooltip();
    });

    // 悬停效果
    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) return;
      const now = performance.now();
      if (now - this.lastHoverCheck < 80) return; // 限制高频鼠标移动触发的射线检测
      this.lastHoverCheck = now;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const gpuMeshes = Datacenter.getPickableGPUMeshes();
      const intersects = this.raycaster.intersectObjects(gpuMeshes, false);

      if (intersects.length > 0) {
        canvas.style.cursor = 'pointer';
        if (this.hoveredObject !== intersects[0].object) {
          if (this.hoveredObject) {
            this.hoveredObject.material.emissiveIntensity = this.hoveredObject.userData.baseEmissive || 0.08;
          }
          this.hoveredObject = intersects[0].object;
          this.hoveredObject.userData.baseEmissive = this.hoveredObject.material.emissiveIntensity;
          this.hoveredObject.material.emissiveIntensity = 0.8;
        }
      } else {
        canvas.style.cursor = 'grab';
        if (this.hoveredObject) {
          this.hoveredObject.material.emissiveIntensity = this.hoveredObject.userData.baseEmissive || 0.08;
          this.hoveredObject = null;
        }
      }
    });
  },

  showTooltip(x, y, data) {
    const tooltip = document.getElementById('scene-tooltip');
    let content = '';

    if (data.type === 'powerRoom') {
      const s = Game.state;
      content = '供电房 | 容量: ' + s.powerCapacityMW + 'MW | 当前负载: ' + Game.getTotalPowerMW().toFixed(1) + 'MW';
    } else if (data.type === 'coolingTower') {
      const s = Game.state;
      const coolingLoad = Game.getGPUActualPowerMW() * CONFIG.COOLING_RATIO;
      content = '冷却塔 | 容量: ' + s.coolingCapacityMW + 'MW | 热负荷: ' + coolingLoad.toFixed(1) + 'MW';
    } else {
      const gpu = CONFIG.GPUS[data.type];
      content = data.type + ' | ' + gpu.arch + ' | ' + gpu.tflops + ' TFLOPS | ' + gpu.vram + 'GB ' + gpu.vram_type;
      if (data.training) content += ' | 训练中';
    }

    tooltip.textContent = content;
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y - 10) + 'px';
    tooltip.classList.remove('hidden');
  },

  hideTooltip() {
    document.getElementById('scene-tooltip').classList.add('hidden');
  },

  setupControls() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.dragStarted = false;
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragStarted = true;
      }
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;

      this.spherical.theta -= dx * 0.005;
      this.spherical.phi -= dy * 0.005;
      this.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, this.spherical.phi));
      this.updateCameraPosition();
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      setTimeout(() => { this.dragStarted = false; }, 50);
    });
    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.dragStarted = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius += e.deltaY * 0.02;
      this.spherical.radius = Math.max(5, Math.min(60, this.spherical.radius));
      this.updateCameraPosition();
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // === 移动端触摸控制 ===
    let touchStart = null;
    let pinchDist = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.isDragging = true;
        this.dragStarted = false;
      } else if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStart = null;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this.dragStarted = true;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi -= dy * 0.005;
        this.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, this.spherical.phi));
        this.updateCameraPosition();
      } else if (e.touches.length === 2 && pinchDist > 0) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.spherical.radius *= (pinchDist / Math.max(1, d));
        this.spherical.radius = Math.max(5, Math.min(60, this.spherical.radius));
        pinchDist = d;
        this.updateCameraPosition();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      setTimeout(() => { this.dragStarted = false; }, 50);
    });
  },

  updateCameraPosition() {
    const sp = this.spherical;
    this.camera.position.set(
      this.target.x + sp.radius * Math.sin(sp.phi) * Math.cos(sp.theta),
      this.target.y + sp.radius * Math.cos(sp.phi),
      this.target.z + sp.radius * Math.sin(sp.phi) * Math.sin(sp.theta)
    );
    this.camera.lookAt(this.target);
  },

  setupLights() {
    const ambient = new THREE.AmbientLight(0x333355, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x00ff88, 0.15);
    fill.position.set(-10, 5, -5);
    this.scene.add(fill);
  },

  setupGrid() {
    // 地基（紧贴平台，不无限延伸）
    const { w, d } = Datacenter.getPlatformSize();
    const groundSize = Math.max(w + 2, d + 2, 12);
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
    Datacenter.groundMesh = ground;

    // 数据中心平台由 Datacenter 管理
    Datacenter.createPlatform();
  },

  render() {
    if (this.renderer && this.scene && this.camera) {
      const now = performance.now();
      if (now - this.lastRenderTime < 1000 / this.maxRenderFPS) return;
      this.lastRenderTime = now;
      this.renderer.render(this.scene, this.camera);
    }
  },

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
};
