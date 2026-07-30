(function () {
  const BUILDINGS = [
    { id: 'env', name: '环境保护设施', category: '环保设施', status: 'running',
      x: 680, y: 60, w: 170, h: 60, eq: 6, person: 4 },
    { id: 'assembly2', name: '装配二车间', category: '装配车间', status: 'running',
      x: 930, y: 40, w: 280, h: 70, eq: 12, person: 8 },
    { id: 'assembly1', name: '装配一车间', category: '装配车间', status: 'idle',
      x: 930, y: 150, w: 250, h: 80, eq: 10, person: 3 },
    { id: 'lab', name: '综合实验楼', category: '实验楼', status: 'warning',
      x: 1240, y: 140, w: 220, h: 120, eq: 8, person: 6 },
    { id: 'food', name: '食品分析车间', category: '食品分析车间', status: 'running',
      x: 440, y: 200, w: 250, h: 90, eq: 9, person: 5 },
    { id: 'cnc', name: 'CNC加工车间', category: 'CNC车间', status: 'running',
      x: 100, y: 180, w: 280, h: 90, eq: 15, person: 10 },
    { id: 'welding', name: '焊接车间', category: '焊接车间', status: 'maintenance',
      x: 100, y: 620, w: 240, h: 80, eq: 8, person: 2 },
    { id: 'painting', name: '喷涂车间', category: '喷涂车间', status: 'warning',
      x: 380, y: 620, w: 260, h: 80, eq: 7, person: 4 },
    { id: 'assembly3', name: '总装车间', category: '总装车间', status: 'running',
      x: 680, y: 620, w: 280, h: 100, eq: 14, person: 9 },
    { id: 'warehouse', name: '仓储中心', category: '仓储中心', status: 'idle',
      x: 1000, y: 350, w: 180, h: 120, eq: 4, person: 2 },
    { id: 'energy', name: '能源中心', category: '能源中心', status: 'running',
      x: 1280, y: 350, w: 150, h: 120, eq: 5, person: 3 },
    { id: 'admin', name: '行政办公楼', category: '行政楼', status: 'running',
      x: 100, y: 780, w: 260, h: 80, eq: 3, person: 12 },
    { id: 'quality', name: '质量检测中心', category: '质量检测', status: 'running',
      x: 390, y: 780, w: 220, h: 80, eq: 6, person: 5 },
    { id: 'training', name: '培训中心', category: '培训中心', status: 'idle',
      x: 640, y: 780, w: 180, h: 80, eq: 2, person: 1 }
  ];

  const STATUS_MAP = {
    running: { label: '运行中', fill: 'rgba(22,119,255,0.40)', stroke: '#4096FF', accent: 'rgba(22,119,255,0.6)', badge: 'status-running' },
    idle: { label: '空闲', fill: 'rgba(82,196,26,0.35)', stroke: '#73D13D', accent: 'rgba(82,196,26,0.55)', badge: 'status-idle' },
    maintenance: { label: '维护中', fill: 'rgba(90,100,120,0.40)', stroke: '#A6B0C2', accent: 'rgba(90,100,120,0.6)', badge: 'status-maintenance' },
    warning: { label: '预警', fill: 'rgba(250,173,20,0.30)', stroke: '#FFC53D', accent: 'rgba(250,173,20,0.5)', badge: 'status-warning' }
  };

  const CATEGORY_COLORS = {
    '装配车间': '#4096FF', 'CNC车间': '#4096FF', '总装车间': '#4096FF',
    '环保设施': '#4096FF', '食品分析车间': '#4096FF', '能源中心': '#4096FF',
    '实验楼': '#FFC53D', '焊接车间': '#A6B0C2', '喷涂车间': '#FFC53D',
    '仓储中心': '#73D13D', '行政楼': '#4096FF', '质量检测': '#4096FF',
    '培训中心': '#73D13D'
  };

  let state = {
    scale: 1,
    offset: { x: 0, y: 0 },
    selectedBuilding: null,
    layers: { equipment: true, personnel: true, labels: true },
    filteredCategory: null
  };

  function buildSVG() {
    const svg = document.getElementById('campusSvg');
    const vb = document.createElementNS('http://www.w3.org/2000/svg', 'viewBox');

    const defs = `
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" class="grid-bg"/>
        </pattern>
      </defs>`;

    let terrain = '';
    terrain += '<rect width="1600" height="1000" fill="#0A0E1A"/>';
    terrain += '<rect width="1600" height="1000" fill="url(#grid-pattern)"/>';
    terrain += '<path d="M 40,500 Q 200,480 400,490 T 800,500 T 1200,510 T 1560,505 L 1560,560 Q 1200,570 800,560 T 400,555 T 40,565 Z" class="road"/>';
    terrain += '<path d="M 40,530 L 1560,530" class="road-center"/>';
    terrain += '<path d="M 820,40 L 820,960" class="road"/>';
    terrain += '<path d="M 825,40 L 865,960" class="road-center"/>';
    terrain += '<path d="M 40,120 L 1560,120" class="road"/>';
    terrain += '<path d="M 40,870 L 1560,870" class="road"/>';
    terrain += '<rect x="60" y="160" width="320" height="300" class="green-area" rx="8"/>';
    terrain += '<rect x="920" y="580" width="620" height="260" class="green-area" rx="8"/>';
    terrain += '<circle cx="180" cy="280" r="60" class="water"/>';
    terrain += '<circle cx="220" cy="300" r="45" class="water"/>';
    terrain += '<ellipse cx="1250" cy="700" rx="100" ry="60" class="water"/>';
    const trees = [[100,200],[140,230],[220,180],[280,220],[340,200],[180,420],[260,440],
      [980,620],[1050,650],[1120,630],[1190,660],[1420,620],[1480,660],
      [1250,800],[1340,820],[1440,810],[500,600],[600,620],[700,610]];
    trees.forEach(([x,y]) => {
      const r = 8 + Math.round(Math.random() * 4);
      terrain += `<circle cx="${x}" cy="${y}" r="${r}" class="tree"/>`;
    });

    let buildings = '';
    BUILDINGS.forEach(b => {
      const s = STATUS_MAP[b.status];
      buildings += `<g class="building-group" data-building-id="${b.id}">`;
      buildings += `<rect class="building" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" fill="${s.fill}" stroke="${s.stroke}"/>`;
      buildings += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="14" rx="4" fill="${s.accent}"/>`;
      const winCols = Math.max(2, Math.floor(b.w / 60));
      const winRows = Math.max(1, Math.floor((b.h - 30) / 45));
      const winW = Math.min(45, Math.floor((b.w - winCols * 10) / winCols));
      const winH = Math.min(40, Math.floor((b.h - 40) / winRows));
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = b.x + 15 + c * (winW + 10);
          const wy = b.y + 25 + r * (winH + 8);
          buildings += `<rect x="${wx}" y="${wy}" width="${winW}" height="${winH}" fill="${hexToRgba(s.stroke, 0.25)}" rx="2"/>`;
        }
      }
      buildings += `</g>`;
    });

    let labels = '';
    const LABEL_POS = {
      env:       {tx: 700, ty: 30, lx: 765, ly: 60, anchor: 'start'},
      assembly2: {tx: 1150, ty: 15, lx: 1070, ly: 40, anchor: 'start'},
      assembly1: {tx: 1130, ty: 255, lx: 1055, ly: 230, anchor: 'start'},
      lab:       {tx: 1430, ty: 115, lx: 1350, ly: 140, anchor: 'start'},
      food:      {tx: 480, ty: 320, lx: 565, ly: 290, anchor: 'start'},
      cnc:       {tx: 390, ty: 145, lx: 240, ly: 180, anchor: 'start'},
      welding:   {tx: 100, ty: 585, lx: 220, ly: 620, anchor: 'start'},
      painting:  {tx: 400, ty: 585, lx: 510, ly: 620, anchor: 'start'},
      assembly3: {tx: 700, ty: 585, lx: 820, ly: 620, anchor: 'start'},
      warehouse: {tx: 1000, ty: 510, lx: 1090, ly: 470, anchor: 'start'},
      energy:    {tx: 1450, ty: 510, lx: 1355, ly: 470, anchor: 'start'},
      admin:     {tx: 110, ty: 745, lx: 230, ly: 780, anchor: 'start'},
      quality:   {tx: 400, ty: 745, lx: 500, ly: 780, anchor: 'start'},
      training:  {tx: 820, ty: 745, lx: 730, ly: 780, anchor: 'start'}
    };
    BUILDINGS.forEach(b => {
      const p = LABEL_POS[b.id];
      if (!p) return;
      const s = STATUS_MAP[b.status];
      labels += `<g>`;
      labels += `<path class="leader-line" d="M ${p.lx} ${p.ly} L ${p.lx} ${p.ty} L ${p.tx} ${p.ty}"/>`;
      labels += `<circle cx="${p.lx}" cy="${p.ly}" r="3" fill="${s.stroke}"/>`;
      labels += `<text x="${p.tx}" y="${p.ty - 4}" class="building-label" style="stroke:rgba(0,0,0,0.75);stroke-width:3px;paint-order:stroke;">${b.name}</text>`;
      labels += `<text x="${p.tx}" y="${p.ty - 4}" class="building-label">${b.name}</text>`;
      labels += `</g>`;
    });
    labels += `<text x="810" y="930" class="building-label" text-anchor="middle" style="font-size:13px;fill:#4096FF;font-weight:600;">园区大门</text>`;
    labels += `<rect x="780" y="895" width="60" height="40" rx="3" fill="rgba(22,119,255,0.45)" stroke="#4096FF" stroke-width="1.5"/>`;

    let equipMarkers = '';
    const EQUI_SPOTS = [
      [130,230],[180,230],[230,230],[280,230],[330,230],
      [470,250],[540,250],[610,250],
      [960,95],[1020,95],[1080,95],[1140,95],
      [960,195],[1020,195],[1080,195],[1140,195],
      [710,680],[775,680],[840,680],[905,680],
      [1040,420],[1090,420],[1140,420],
      [1320,400],[1370,400],
      [150,280],[200,300],[250,320],
      [130,820],[190,820],[250,820],[310,820],
      [430,820],[490,820],[560,820],
      [670,820],[730,820],[790,820]
    ];
    EQUI_SPOTS.forEach(([x,y], i) => {
      const colors = ['#4096FF','#4096FF','#4096FF','#FFC53D','#4096FF','#73D13D'];
      const c = colors[i % colors.length];
      equipMarkers += `<circle class="equipment-marker" cx="${x}" cy="${y}" r="4" fill="${c}" data-eq-id="EQ-${String(i+1).padStart(3,'0')}"/>`;
    });

    let personDots = '';
    const PERS_SPOTS = [
      [150,250],[250,240],[320,260],[420,250],[600,260],
      [990,100],[1100,105],[1000,205],[1160,210],[1330,190],[1420,240],
      [720,680],[860,690],[1040,430],[1340,430],
      [180,820],[290,820],[450,820],[680,820],[780,820]
    ];
    PERS_SPOTS.forEach(([x,y], i) => {
      const colors = ['#1677FF','#1677FF','#52C41A','#FFC53D'];
      const c = colors[i % colors.length];
      personDots += `<circle class="personnel-dot" cx="${x}" cy="${y}" r="5" fill="${c}" opacity="0.8" data-person-id="EMP-${String(i+1).padStart(2,'0')}"/>`;
    });

    svg.innerHTML = `
      ${defs}
      <g id="mapRoot">
        <g id="terrainLayer">${terrain}</g>
        <g id="buildingLayer">${buildings}</g>
        <g id="labelLayer" style="${state.layers.labels ? '' : 'display:none;'}">${labels}</g>
        <g id="equipmentLayer" style="${state.layers.equipment ? '' : 'display:none;'}">${equipMarkers}</g>
        <g id="personnelLayer" style="${state.layers.personnel ? '' : 'display:none;'}">${personDots}</g>
      </g>`;

    bindBuildingInteractions();
    bindLayerInteractions();
    updateZoomIndicator();
  }

  function hexToRgba(hex, a) {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function bindBuildingInteractions() {
    const svg = document.getElementById('campusSvg');
    const tooltip = document.getElementById('mapTooltip');

    svg.querySelectorAll('.building-group').forEach(g => {
      const id = g.dataset.buildingId;
      const b = BUILDINGS.find(x => x.id === id);
      if (!b) return;

      g.addEventListener('mouseenter', e => showTooltip(e, b));
      g.addEventListener('mousemove', e => moveTooltip(e));
      g.addEventListener('mouseleave', () => hideTooltip());
      g.addEventListener('click', e => {
        e.stopPropagation();
        selectBuilding(b);
      });
    });

    svg.querySelectorAll('.equipment-marker').forEach(c => {
      c.addEventListener('click', e => {
        e.stopPropagation();
        App.toast(`设备 ${c.dataset.eqId} 详情已打开`, 'info', '设备信息');
      });
    });
    svg.querySelectorAll('.personnel-dot').forEach(c => {
      c.addEventListener('click', e => {
        e.stopPropagation();
        App.toast(`人员 ${c.dataset.personId} 定位信息`, 'info', '人员定位');
      });
    });

    svg.addEventListener('click', e => {
      if (e.target.tagName === 'svg' || e.target.closest('#terrainLayer')) {
        clearSelection();
      }
    });
  }

  function showTooltip(e, b) {
    const s = STATUS_MAP[b.status];
    const tip = document.getElementById('mapTooltip');
    tip.innerHTML = `
      <div class="map-tooltip-title">${b.name}</div>
      <div class="map-tooltip-row"><span>类别</span><span>${b.category}</span></div>
      <div class="map-tooltip-row"><span>状态</span><span style="color:${s.stroke}">${s.label}</span></div>
      <div class="map-tooltip-row"><span>设备数</span><span>${b.eq} 台</span></div>
      <div class="map-tooltip-row"><span>人员数</span><span>${b.person} 人</span></div>
      <div style="font-size:11px;color:var(--brand-light);margin-top:4px;">点击查看详情</div>`;
    tip.classList.add('show');
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const tip = document.getElementById('mapTooltip');
    const rect = document.getElementById('campusMapWrapper').getBoundingClientRect();
    const x = e.clientX - rect.left + 14;
    const y = e.clientY - rect.top + 14;
    tip.style.left = Math.min(x, rect.width - 220) + 'px';
    tip.style.top = Math.min(y, rect.height - 160) + 'px';
  }

  function hideTooltip() {
    document.getElementById('mapTooltip').classList.remove('show');
  }

  function selectBuilding(b) {
    state.selectedBuilding = b.id;
    document.querySelectorAll('.building-group').forEach(g => {
      g.classList.toggle('selected', g.dataset.buildingId === b.id);
    });
    showInfoPanel(b);
    App.toast(`已选中: ${b.name}`, 'info');
  }

  function clearSelection() {
    state.selectedBuilding = null;
    document.querySelectorAll('.building-group').forEach(g => g.classList.remove('selected'));
    document.getElementById('infoPanel').style.display = 'none';
  }

  function showInfoPanel(b) {
    const s = STATUS_MAP[b.status];
    const panel = document.getElementById('infoPanel');
    const body = document.getElementById('infoPanelBody');
    document.getElementById('infoBuildingName').textContent = b.name;

    const relatedAlerts = (window.MockData ? MockData.data.alerts : [])
      .filter((_, i) => i % 3 === BUILDINGS.indexOf(b) % 3)
      .slice(0, 2);

    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span class="status-badge ${s.badge}"><span class="dot"></span>${s.label}</span>
        <span style="font-size:12px;color:var(--text-muted);">${b.category}</span>
      </div>
      <div class="info-row"><span class="info-row-label"><i data-lucide="map-pin" style="width:14px;height:14px;"></i>位置坐标</span><span class="info-row-value">(${b.x}, ${b.y})</span></div>
      <div class="info-row"><span class="info-row-label"><i data-lucide="cpu" style="width:14px;height:14px;"></i>设备数量</span><span class="info-row-value" style="color:${s.stroke}">${b.eq} 台</span></div>
      <div class="info-row"><span class="info-row-label"><i data-lucide="users" style="width:14px;height:14px;"></i>在岗人员</span><span class="info-row-value">${b.person} 人</span></div>
      <div class="info-row"><span class="info-row-label"><i data-lucide="activity" style="width:14px;height:14px;"></i>运行时长</span><span class="info-row-value">${Math.floor(Math.random()*800)+200} h</span></div>
      <div class="info-row"><span class="info-row-label"><i data-lucide="gauge" style="width:14px;height:14px;"></i>利用率</span><span class="info-row-value">${Math.floor(Math.random()*40)+50}%</span></div>
      <div style="margin-top:14px;">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">相关预警</div>
        <div class="alert-list">
          ${relatedAlerts.length === 0 ? '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px;">暂无预警</div>' :
            relatedAlerts.map((a,i) => `
              <div class="alert-mini ${a.level === 'critical' ? 'critical' : a.level === 'high' ? 'high' : ''}">
                <div class="alert-mini-title">${a.message}</div>
                <div class="alert-mini-time">${a.createdAt} · ${a.assignee}</div>
              </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-ghost" style="flex:1;font-size:12px;" id="viewDetailBtn">查看详情</button>
        <button class="btn btn-primary" style="flex:1;font-size:12px;" id="viewTasksBtn">查看任务</button>
      </div>`;

    panel.style.display = 'flex';
    if (window.lucide) lucide.createIcons();

    document.getElementById('viewDetailBtn').onclick = () => {
      App.toast(`查看 ${b.name} 详细信息`, 'info');
      if (window.MockData) {
        const d = MockData.data;
        const html = `
          <div class="modal-mask show" id="detailModal">
            <div class="modal">
              <div class="modal-header">
                <h3>${b.name} - 详细信息</h3>
                <button class="modal-close" onclick="App.closeModal('detailModal');lucide.createIcons();"><i data-lucide="x"></i></button>
              </div>
              <div class="modal-body">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                  <span class="status-badge ${s.badge}"><span class="dot"></span>${s.label}</span>
                  <span style="color:var(--text-primary);font-weight:500;">${b.category}</span>
                </div>
                <div class="modal-detail-row"><span class="modal-detail-label">建筑编号</span><span class="modal-detail-value">BLD-${b.id.toUpperCase()}</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">建筑类别</span><span class="modal-detail-value">${b.category}</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">设备数量</span><span class="modal-detail-value">${b.eq} 台</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">人员数量</span><span class="modal-detail-value">${b.person} 人</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">位置坐标</span><span class="modal-detail-value">(${b.x}, ${b.y})</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">建筑面积</span><span class="modal-detail-value">${Math.round(b.w * b.h / 5)} m²</span></div>
                <div class="modal-detail-row"><span class="modal-detail-label">负责人</span><span class="modal-detail-value">${d.personnel[Math.floor(Math.random()*d.personnel.length)].name}</span></div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-ghost" onclick="App.closeModal('detailModal')">关闭</button>
                <button class="btn btn-primary" onclick="App.closeModal('detailModal');App.toast('已分配任务','success');lucide.createIcons();">分配任务</button>
              </div>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        App.openModal('detailModal');
        if (window.lucide) lucide.createIcons();
      }
    };
    document.getElementById('viewTasksBtn').onclick = () => {
      App.toast(`查看 ${b.name} 相关任务`, 'info');
    };
  }

  function bindLayerInteractions() {
    document.querySelectorAll('.layer-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const layer = toggle.dataset.layer;
        state.layers[layer] = !state.layers[layer];
        toggle.classList.toggle('active', state.layers[layer]);
        const layerEl = document.getElementById(layer + 'Layer');
        if (layerEl) layerEl.style.display = state.layers[layer] ? '' : 'none';
        App.toast(`${layer === 'equipment' ? '设备' : layer === 'personnel' ? '人员' : '标签'}图层 ${state.layers[layer] ? '已显示' : '已隐藏'}`, 'info');
      });
    });
  }

  function setupMapControls() {
    const svg = document.getElementById('campusSvg');
    const root = document.getElementById('mapRoot');

    document.getElementById('zoomInBtn').onclick = () => applyZoom(1.25);
    document.getElementById('zoomOutBtn').onclick = () => applyZoom(0.8);
    document.getElementById('resetViewBtn').onclick = () => resetView();
    document.getElementById('fullscreenBtn').onclick = () => {
      const wrapper = document.getElementById('campusMapWrapper');
      if (document.fullscreenElement) document.exitFullscreen();
      else wrapper.requestFullscreen();
    };

    function applyZoom(factor) {
      state.scale *= factor;
      state.scale = Math.max(0.4, Math.min(4, state.scale));
      updateTransform();
    }
    function resetView() {
      state.scale = 1;
      state.offset = { x: 0, y: 0 };
      updateTransform();
      App.toast('视图已重置', 'success');
    }
    function updateTransform() {
      if (root) root.setAttribute('transform', `translate(${state.offset.x},${state.offset.y}) scale(${state.scale})`);
      updateZoomIndicator();
    }
    function updateZoomIndicator() {
      document.getElementById('zoomLevel').textContent = Math.round(state.scale * 100) + '%';
    }

    let isDragging = false;
    let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
    svg.addEventListener('mousedown', e => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY, ox: state.offset.x, oy: state.offset.y };
    });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      state.offset.x = dragStart.ox + (e.clientX - dragStart.x);
      state.offset.y = dragStart.oy + (e.clientY - dragStart.y);
      updateTransform();
    });
    window.addEventListener('mouseup', () => isDragging = false);
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      applyZoom(factor);
    }, { passive: false });
  }

  function renderSidebar() {
    const categories = {};
    BUILDINGS.forEach(b => {
      if (!categories[b.category]) categories[b.category] = [];
      categories[b.category].push(b);
    });

    const legend = Object.entries(categories).map(([cat, list]) => {
      const color = CATEGORY_COLORS[cat] || '#4096FF';
      return `<div class="legend-item" data-category="${cat}">
        <div class="legend-item-left">
          <span class="legend-color-box" style="background:${color};"></span>
          <span>${cat}</span>
        </div>
        <span class="legend-count">${list.length}</span>
      </div>`;
    }).join('');
    document.getElementById('legendList').innerHTML = legend;

    document.querySelectorAll('#legendList .legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.dataset.category;
        if (state.filteredCategory === cat) {
          state.filteredCategory = null;
          item.classList.remove('active');
        } else {
          state.filteredCategory = cat;
          document.querySelectorAll('#legendList .legend-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
        document.querySelectorAll('.building-group').forEach(g => {
          const b = BUILDINGS.find(x => x.id === g.dataset.buildingId);
          if (!b) return;
          const show = !state.filteredCategory || b.category === state.filteredCategory;
          g.style.display = show ? '' : 'none';
        });
        App.toast(state.filteredCategory ? `已筛选: ${state.filteredCategory}` : '已显示全部建筑', 'info');
      });
    });

    const totalEq = BUILDINGS.reduce((s,b) => s + b.eq, 0);
    const totalPerson = BUILDINGS.reduce((s,b) => s + b.person, 0);
    const runningCount = BUILDINGS.filter(b => b.status === 'running').length;
    const warningCount = BUILDINGS.filter(b => b.status === 'warning').length;

    document.getElementById('quickStats').innerHTML = `
      <div class="stat-card-mini"><div class="stat-value-mini">${BUILDINGS.length}</div><div class="stat-label-mini">建筑总数</div></div>
      <div class="stat-card-mini"><div class="stat-value-mini">${totalEq}</div><div class="stat-label-mini">设备总数</div></div>
      <div class="stat-card-mini"><div class="stat-value-mini">${runningCount}</div><div class="stat-label-mini">运行中</div></div>
      <div class="stat-card-mini"><div class="stat-value-mini" style="color:var(--warning);">${warningCount}</div><div class="stat-label-mini">预警数</div></div>`;

    if (window.MockData && MockData.data.alerts) {
      const recent = MockData.data.alerts.slice(0, 4);
      document.getElementById('sidebarAlerts').innerHTML = recent.map(a => `
        <div class="alert-mini ${a.level === 'critical' ? 'critical' : a.level === 'high' ? 'high' : ''}">
          <div class="alert-mini-title">${a.message}</div>
          <div class="alert-mini-time">${a.createdAt}</div>
        </div>`).join('');
    }
  }

  function bindHeader() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        App.toast(`跳转到 ${item.textContent}`, 'info');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector('[data-page="campus"]').classList.add('active');
      });
    });

    document.getElementById('syncBtn').onclick = () => {
      App.toast('正在同步数据...', 'info');
      setTimeout(() => {
        if (window.MockData) MockData.refresh();
        renderSidebar();
        App.toast('数据同步完成', 'success');
      }, 800);
    };

    document.getElementById('userBtn').onclick = () => App.toast('管理员账户信息', 'info');
    document.getElementById('infoPanelClose').onclick = clearSelection;
  }

  function updateClock() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('currentTime').textContent =
      `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    document.getElementById('lastUpdateTime').textContent =
      `最后更新: ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildSVG();
    setupMapControls();
    renderSidebar();
    bindHeader();
    updateClock();
    setInterval(updateClock, 1000);
    if (window.lucide) lucide.createIcons();
  });
})();
