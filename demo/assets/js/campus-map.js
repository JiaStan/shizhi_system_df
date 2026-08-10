(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 1600;
  const VIEW_H = 900;

  const STATUS_CONFIG = {
    online: { label: '运行中', color: '#1677FF' },
    idle: { label: '空闲', color: '#52C41A' },
    warning: { label: '预警', color: '#FAAD14' },
    fault: { label: '故障', color: '#FF4D4F' },
    maintenance: { label: '维护中', color: '#8B95A8' },
    offline: { label: '离线', color: '#8B95A8' }
  };

  const PERSONNEL_STATUS = {
    working: { label: '作业中', color: '#1677FF' },
    idle: { label: '空闲', color: '#52C41A' },
    rest: { label: '休息', color: '#8B95A8' },
    alert: { label: '预警', color: '#FAAD14' }
  };

  const ZONES = [
    { id: 'SZC', name: '仓库装配区', shortName: 'SZC', row: 0, col: 0, colSpan: 1 },
    { id: 'SZA', name: '装配一期车间', shortName: 'SZA', row: 0, col: 1, colSpan: 1 },
    { id: 'SZB', name: '装配二期车间', shortName: 'SZB', row: 0, col: 2, colSpan: 1 },
    { id: 'JP1', name: '竞品装配一区', shortName: 'JP1', row: 1, col: 0, colSpan: 1 },
    { id: 'AGV', name: 'AGV通道', shortName: 'AGV', row: 1, col: 1, colSpan: 1, isCorridor: true },
    { id: 'JP2', name: '竞品装配二区', shortName: 'JP2', row: 1, col: 2, colSpan: 1 },
    { id: 'LH', name: '联合装配区', shortName: 'LH', row: 2, col: 0, colSpan: 3 },
    { id: 'CX1', name: '外委装配区', shortName: 'CX1', row: 3, col: 0, colSpan: 2 },
    { id: 'CX2', name: '外委装配区', shortName: 'CX2', row: 3, col: 2, colSpan: 1 }
  ];

  let zoneDevices = {};
  let zonePersonnel = {};
  let svg = null;
  let zoomLevel = 1;
  let panOffset = { x: 0, y: 0 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let selectedZone = null;
  let activeStatusFilter = 'all';
  let showEquipment = true;
  let showPersonnel = true;
  let tooltip = null;
  let personnelDetailModal = null;

  function generateZoneData() {
    const statusKeys = Object.keys(STATUS_CONFIG);
    const personnelStatusKeys = Object.keys(PERSONNEL_STATUS);

    ZONES.forEach(zone => {
      const deviceCount = zone.isCorridor ? 0 : Math.floor(Math.random() * 8) + 8;
      const devices = [];
      for (let i = 0; i < deviceCount; i++) {
        const status = statusKeys[Math.floor(Math.random() * 5)];
        devices.push({
          id: `${zone.id}-EQ-${String(i + 1).padStart(2, '0')}`,
          zoneId: zone.id,
          name: `${zone.shortName}设备${i + 1}`,
          status: status,
          statusLabel: STATUS_CONFIG[status].label
        });
      }
      zoneDevices[zone.id] = devices;

      const personCount = zone.isCorridor ? 0 : Math.floor(deviceCount * 0.7);
      const personnel = [];
      const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
      for (let i = 0; i < personCount; i++) {
        const pStatus = personnelStatusKeys[Math.floor(Math.random() * personnelStatusKeys.length)];
        personnel.push({
          id: `${zone.id}-P-${String(i + 1).padStart(2, '0')}`,
          zoneId: zone.id,
          name: surnames[Math.floor(Math.random() * surnames.length)] + (Math.floor(Math.random() * 900) + 100),
          status: pStatus,
          statusLabel: PERSONNEL_STATUS[pStatus].label
        });
      }
      zonePersonnel[zone.id] = personnel;
    });
  }

  function init() {
    const container = document.getElementById('campus-svg-container');
    if (!container) return;

    generateZoneData();
    setupPersonnelModal();

    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.cssText = 'width:100%;height:100%;cursor:grab;user-select:none;background:transparent;';
    container.innerHTML = '';
    container.appendChild(svg);

    drawFloor();
    setupInteractions();
    setupToolbar();
    setupFilters();
    applyTransform();
    buildLegendOverlay();

    window.CampusMap = {
      refresh: function () {
        generateZoneData();
        redraw();
      }
    };
  }

  function drawFloor() {
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = `
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(22,119,255,0.06)" stroke-width="0.5"/>
      </pattern>
    `;
    svg.appendChild(defs);

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', VIEW_W);
    bg.setAttribute('height', VIEW_H);
    bg.setAttribute('fill', '#0A1128');
    svg.appendChild(bg);

    const grid = document.createElementNS(SVG_NS, 'rect');
    grid.setAttribute('width', VIEW_W);
    grid.setAttribute('height', VIEW_H);
    grid.setAttribute('fill', 'url(#gridPattern)');
    svg.appendChild(grid);

    const cols = 3;
    const rows = 4;
    const margin = 60;
    const gap = 16;
    const availW = VIEW_W - margin * 2;
    const availH = VIEW_H - margin * 2;
    const cellW = (availW - gap * (cols - 1)) / cols;
    const cellH = (availH - gap * (rows - 1)) / rows;

    ZONES.forEach(zone => {
      const x = margin + zone.col * (cellW + gap);
      const y = margin + zone.row * (cellH + gap);
      const w = zone.colSpan * cellW + (zone.colSpan - 1) * gap;
      const h = cellH;
      zone._bounds = { x, y, w, h };
      drawZone(zone);
    });
  }

  function drawZone(zone) {
    const { x, y, w, h } = zone._bounds;

    const isCorridor = zone.isCorridor;
    const bgColor = isCorridor ? 'rgba(22,119,255,0.06)' : 'rgba(22,119,255,0.12)';
    const borderColor = isCorridor ? 'rgba(22,119,255,0.25)' : 'rgba(22,119,255,0.5)';

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'zone-group');
    g.setAttribute('data-zone-id', zone.id);
    g.style.cursor = 'pointer';

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', '6');
    rect.setAttribute('fill', bgColor);
    rect.setAttribute('stroke', borderColor);
    rect.setAttribute('stroke-width', isCorridor ? '1.5' : '2');
    g.appendChild(rect);

    if (isCorridor) {
      const arrow = document.createElementNS(SVG_NS, 'text');
      arrow.setAttribute('x', x + w / 2);
      arrow.setAttribute('y', y + h / 2 + 5);
      arrow.setAttribute('text-anchor', 'middle');
      arrow.setAttribute('fill', 'rgba(22,119,255,0.6)');
      arrow.setAttribute('font-size', '28');
      arrow.textContent = '⇄';
      g.appendChild(arrow);
    }

    const titleBg = document.createElementNS(SVG_NS, 'rect');
    titleBg.setAttribute('x', x + 8);
    titleBg.setAttribute('y', y + 8);
    titleBg.setAttribute('width', Math.min(zone.name.length * 14 + 20, w - 16));
    titleBg.setAttribute('height', '26');
    titleBg.setAttribute('rx', '4');
    titleBg.setAttribute('fill', 'rgba(22,119,255,0.25)');
    titleBg.setAttribute('stroke', 'rgba(22,119,255,0.6)');
    titleBg.setAttribute('stroke-width', '1');
    g.appendChild(titleBg);

    const title = document.createElementNS(SVG_NS, 'text');
    title.setAttribute('x', x + 18);
    title.setAttribute('y', y + 26);
    title.setAttribute('fill', '#E6F4FF');
    title.setAttribute('font-size', '13');
    title.setAttribute('font-weight', '600');
    title.textContent = zone.name;
    g.appendChild(title);

    const countText = document.createElementNS(SVG_NS, 'text');
    countText.setAttribute('x', x + w - 12);
    countText.setAttribute('y', y + 26);
    countText.setAttribute('text-anchor', 'end');
    countText.setAttribute('fill', '#94A3B8');
    countText.setAttribute('font-size', '11');
    const deviceCount = (zoneDevices[zone.id] || []).length;
    const personCount = (zonePersonnel[zone.id] || []).length;
    countText.textContent = isCorridor ? '' : `设备${deviceCount}·人员${personCount}`;
    g.appendChild(countText);

    svg.appendChild(g);

    if (!isCorridor) {
      drawZoneDevices(zone);
      drawZonePersonnel(zone);
    }
  }

  function drawZoneDevices(zone) {
    const devices = zoneDevices[zone.id] || [];
    const { x, y, w, h } = zone._bounds;
    const contentX = x + 12;
    const contentY = y + 46;
    const contentW = w - 24;
    const contentH = h - 92;

    const visibleDevices = showEquipment && activeStatusFilter === 'all'
      ? devices
      : devices.filter(d => activeStatusFilter === 'all' || d.status === activeStatusFilter);

    if (!visibleDevices.length) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'devices-layer');
      g.setAttribute('data-zone-id', zone.id);
      svg.appendChild(g);
      return;
    }

    const cols = Math.min(4, Math.ceil(Math.sqrt(visibleDevices.length)));
    const rows = Math.ceil(visibleDevices.length / cols);
    const gap = 6;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const cellH = (contentH - gap * (rows - 1)) / rows;
    const size = Math.min(cellW - 4, cellH - 4, 28);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'devices-layer');
    g.setAttribute('data-zone-id', zone.id);

    visibleDevices.forEach((device, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = contentX + col * (cellW + gap) + cellW / 2;
      const cy = contentY + row * (cellH + gap) + cellH / 2;
      const cfg = STATUS_CONFIG[device.status];

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', cx - size / 2);
      rect.setAttribute('y', cy - size / 2);
      rect.setAttribute('width', size);
      rect.setAttribute('height', size);
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', cfg.color);
      rect.setAttribute('opacity', '0.85');
      rect.style.cursor = 'pointer';
      rect.addEventListener('mouseenter', (e) => {
        showTooltipAt(e, `
          <div style="font-weight:600;color:#E2E8F0;font-size:13px">${device.name}</div>
          <div style="color:#94A3B8;font-size:11px;margin-top:3px">编号：${device.id}</div>
          <div style="color:${cfg.color};font-size:12px;margin-top:3px">● ${cfg.label}</div>
        `);
      });
      rect.addEventListener('mouseleave', hideTooltip);
      rect.addEventListener('click', (e) => {
        e.stopPropagation();
        showDeviceDetail(device);
      });
      g.appendChild(rect);
    });

    svg.appendChild(g);
  }

  function drawZonePersonnel(zone) {
    const personnel = zonePersonnel[zone.id] || [];
    const { x, y, w, h } = zone._bounds;
    const footerY = y + h - 32;

    if (!showPersonnel || !personnel.length) {
      return;
    }

    const visiblePersonnel = personnel.filter(p => {
      if (activeStatusFilter === 'all') return true;
      return activeStatusFilter === 'working' ? p.status === 'working' :
             activeStatusFilter === 'idle' ? p.status === 'idle' : true;
    });

    if (!visiblePersonnel.length) return;

    const footerBg = document.createElementNS(SVG_NS, 'rect');
    footerBg.setAttribute('x', x + 8);
    footerBg.setAttribute('y', footerY);
    footerBg.setAttribute('width', w - 16);
    footerBg.setAttribute('height', '24');
    footerBg.setAttribute('rx', '3');
    footerBg.setAttribute('fill', 'rgba(0,0,0,0.3)');
    svg.appendChild(footerBg);

    const maxDots = Math.min(visiblePersonnel.length, 12);
    const spacing = Math.min(16, (w - 32) / (maxDots + 2));
    const startX = x + 20;

    for (let i = 0; i < maxDots; i++) {
      const person = visiblePersonnel[i];
      const px = startX + i * spacing;
      const py = footerY + 12;
      const cfg = PERSONNEL_STATUS[person.status];
      const iconSize = 10;

      const g = document.createElementNS(SVG_NS, 'g');
      g.style.cursor = 'pointer';
      g.setAttribute('transform', `translate(${px}, ${py})`);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', `M0,-${iconSize*0.55} C-${iconSize*0.25},-${iconSize*0.55} -${iconSize*0.4},-${iconSize*0.3} -${iconSize*0.4},-${iconSize*0.05} C-${iconSize*0.4},${iconSize*0.15} -${iconSize*0.2},${iconSize*0.25} 0,${iconSize*0.25} C${iconSize*0.2},${iconSize*0.25} ${iconSize*0.4},${iconSize*0.15} ${iconSize*0.4},-${iconSize*0.05} C${iconSize*0.4},-${iconSize*0.3} ${iconSize*0.25},-${iconSize*0.55} 0,-${iconSize*0.55} Z M-${iconSize*0.5},${iconSize*0.4} L${iconSize*0.5},${iconSize*0.4} L${iconSize*0.4},${iconSize*0.7} L-${iconSize*0.4},${iconSize*0.7} Z`);
      path.setAttribute('fill', cfg.color);
      path.setAttribute('opacity', '0.9');
      g.appendChild(path);

      const pulse = document.createElementNS(SVG_NS, 'path');
      pulse.setAttribute('d', path.getAttribute('d'));
      pulse.setAttribute('fill', 'none');
      pulse.setAttribute('stroke', cfg.color);
      pulse.setAttribute('stroke-width', '0.8');
      pulse.setAttribute('opacity', '0.5');
      g.appendChild(pulse);

      g.addEventListener('mouseenter', (e) => {
        showTooltipAt(e, `
          <div style="font-weight:600;color:#E2E8F0;font-size:13px">${person.name}</div>
          <div style="color:#94A3B8;font-size:11px;margin-top:3px">${zone.name}</div>
          <div style="color:${cfg.color};font-size:12px;margin-top:3px">● ${cfg.label}</div>
        `);
      });
      g.addEventListener('mouseleave', hideTooltip);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        showPersonnelDetail(person, zone);
      });
      svg.appendChild(g);
    }

    if (visiblePersonnel.length > maxDots) {
      const more = document.createElementNS(SVG_NS, 'text');
      more.setAttribute('x', startX + maxDots * spacing + 4);
      more.setAttribute('y', footerY + 16);
      more.setAttribute('fill', '#94A3B8');
      more.setAttribute('font-size', '10');
      more.textContent = `+${visiblePersonnel.length - maxDots}`;
      svg.appendChild(more);
    }
  }

  function buildLegendOverlay() {
    const container = document.getElementById('campus-svg-container');
    if (!container) return;
    const existing = document.getElementById('mapLegendOverlay');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'mapLegendOverlay';
    div.style.cssText = 'position:absolute;bottom:16px;left:16px;z-index:20;background:rgba(10,17,40,0.88);border:1px solid rgba(22,119,255,0.3);border-radius:10px;padding:12px 16px;display:flex;flex-direction:column;gap:10px;min-width:160px;';

    // Equipment status section
    const eqSection = document.createElement('div');
    eqSection.innerHTML = '<div style="font-size:11px;color:#8B95A8;font-weight:600;letter-spacing:1px;margin-bottom:6px">设备状态</div>';

    const statusKeys = ['online', 'idle', 'warning', 'fault', 'maintenance'];
    statusKeys.forEach(key => {
      const cfg = STATUS_CONFIG[key];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:2px 0;';
      row.innerHTML = `
        <div style="width:12px;height:12px;border-radius:2px;background:${cfg.color};flex-shrink:0"></div>
        <span style="font-size:12px;color:#E2E8F0">${cfg.label}</span>
      `;
      eqSection.appendChild(row);
    });
    div.appendChild(eqSection);

    // Personnel status section
    const separator = document.createElement('div');
    separator.style.cssText = 'height:1px;background:rgba(22,119,255,0.15);margin:2px 0;';
    div.appendChild(separator);
    const pSection = document.createElement('div');
    pSection.innerHTML = '<div style="font-size:11px;color:#8B95A8;font-weight:600;letter-spacing:1px;margin-bottom:6px">人员状态</div>';

    const pStatusKeys = ['working', 'idle', 'rest', 'alert'];
    pStatusKeys.forEach(key => {
      const cfg = PERSONNEL_STATUS[key];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:2px 0;';
      // person icon
      const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      iconSvg.setAttribute('width', '12');
      iconSvg.setAttribute('height', '12');
      iconSvg.setAttribute('viewBox', '-6 -8 12 16');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0,-5.5 C-2.5,-5.5 -4,-3 -4,-0.5 C-4,1.5 -2,2.5 0,2.5 C2,2.5 4,1.5 4,-0.5 C4,-3 2.5,-5.5 0,-5.5 Z M-5,4 L5,4 L4,7 L-4,7 Z');
      path.setAttribute('fill', cfg.color);
      iconSvg.appendChild(path);
      row.appendChild(iconSvg);
      const label = document.createElement('span');
      label.style.cssText = 'font-size:12px;color:#E2E8F0';
      label.textContent = cfg.label;
      row.appendChild(label);
      pSection.appendChild(row);
    });
    div.appendChild(pSection);

    container.appendChild(div);
  }

  function setupInteractions() {
    svg.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (target instanceof SVGElement && target.closest('.zone-group, .devices-layer rect')) {
        const zoneGroup = target.closest('.zone-group');
        if (zoneGroup) {
          const zoneId = zoneGroup.getAttribute('data-zone-id');
          highlightZone(zoneId);
        }
        return;
      }
      isPanning = true;
      panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      svg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        panOffset.x = e.clientX - panStart.x;
        panOffset.y = e.clientY - panStart.y;
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      svg.style.cursor = 'grab';
    });

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(4, zoomLevel * delta));
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width * VIEW_W;
      const my = (e.clientY - rect.top) / rect.height * VIEW_H;
      zoomLevel = newZoom;
      panOffset.x -= (mx - panOffset.x) * (1 - newZoom / (zoomLevel / delta));
      panOffset.y -= (my - panOffset.y) * (1 - newZoom / (zoomLevel / delta));
      zoomLevel = newZoom;
      updateZoomLabel();
      applyTransform();
    }, { passive: false });
  }

  function setupToolbar() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => { zoomLevel = Math.min(4, zoomLevel * 1.2); applyTransform(); updateZoomLabel(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => { zoomLevel = Math.max(0.3, zoomLevel / 1.2); applyTransform(); updateZoomLabel(); });
    if (resetViewBtn) resetViewBtn.addEventListener('click', () => { zoomLevel = 1; panOffset = { x: 0, y: 0 }; applyTransform(); updateZoomLabel(); });

    updateZoomLabel();
  }

  function setupFilters() {
    const statusBtns = document.querySelectorAll('[data-status-filter]');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        statusBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeStatusFilter = btn.getAttribute('data-status-filter');
        redraw();
      });
    });

    const equipmentToggle = document.querySelector('[data-layer="equipment"] .layer-switch');
    if (equipmentToggle) {
      equipmentToggle.parentElement.addEventListener('click', () => {
        showEquipment = !showEquipment;
        equipmentToggle.parentElement.classList.toggle('active', showEquipment);
        redraw();
      });
    }

    const personnelToggle = document.querySelector('[data-layer="personnel"] .layer-switch');
    if (personnelToggle) {
      personnelToggle.parentElement.addEventListener('click', () => {
        showPersonnel = !showPersonnel;
        personnelToggle.parentElement.classList.toggle('active', showPersonnel);
        redraw();
      });
    }

    buildSidebar();
  }

  function buildSidebar() {
    const legendList = document.getElementById('legendList');
    if (!legendList) return;

    const zoneStats = ZONES.filter(z => !z.isCorridor).map(z => {
      const devices = zoneDevices[z.id] || [];
      const personnel = zonePersonnel[z.id] || [];
      const online = devices.filter(d => d.status === 'online').length;
      return { ...z, deviceCount: devices.length, personnelCount: personnel.length, online };
    });

    legendList.innerHTML = zoneStats.map(z => `
      <div class="legend-item" data-zone="${z.id}">
        <div class="legend-item-left">
          <div class="legend-color-box" style="background:${z.online > 0 ? 'rgba(22,119,255,0.6)' : 'rgba(82,196,26,0.6)'};border-color:${z.online > 0 ? '#1677FF' : '#52C41A'}"></div>
          <span style="color:#E2E8F0">${z.shortName}</span>
        </div>
        <span class="legend-count">${z.deviceCount}台/${z.personnelCount}人</span>
      </div>
    `).join('');

    legendList.querySelectorAll('.legend-item').forEach(item => {
      item.addEventListener('click', () => {
        const zoneId = item.getAttribute('data-zone');
        highlightZone(zoneId);
        legendList.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });

    const quickStats = document.getElementById('quickStats');
    if (quickStats) {
      const totalDevices = Object.values(zoneDevices).reduce((a, b) => a + b.length, 0);
      const totalPersonnel = Object.values(zonePersonnel).reduce((a, b) => a + b.length, 0);
      const runningDevices = Object.values(zoneDevices).flat().filter(d => d.status === 'online').length;
      const warningDevices = Object.values(zoneDevices).flat().filter(d => d.status === 'warning' || d.status === 'fault').length;

      quickStats.innerHTML = `
        <div class="stat-card-mini">
          <div class="stat-value-mini">${totalDevices}</div>
          <div class="stat-label-mini">设备总数</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-value-mini">${runningDevices}</div>
          <div class="stat-label-mini">运行中</div>
        </div>
        <div class="stat-card-mini">
          <div class="stat-value-mini">${totalPersonnel}</div>
          <div class="stat-label-mini">人员总数</div>
        </div>
        <div class="stat-card-mini" style="${warningDevices > 0 ? 'border-color:#FAAD14' : ''}">
          <div class="stat-value-mini" style="${warningDevices > 0 ? 'color:#FAAD14' : ''}">${warningDevices}</div>
          <div class="stat-label-mini">预警/故障</div>
        </div>
      `;
    }

    const sidebarAlerts = document.getElementById('sidebarAlerts');
    if (sidebarAlerts) {
      const alerts = [];
      Object.entries(zoneDevices).forEach(([zoneId, devices]) => {
        devices.forEach(d => {
          if (d.status === 'fault') {
            alerts.push({ type: 'critical', title: `${d.name} 故障`, zone: zoneId });
          } else if (d.status === 'warning') {
            alerts.push({ type: 'high', title: `${d.name} 预警`, zone: zoneId });
          }
        });
      });
      alerts.slice(0, 5).forEach(a => {
        const div = document.createElement('div');
        div.className = `alert-mini ${a.type}`;
        div.innerHTML = `<div class="alert-mini-title">${a.title}</div><div class="alert-mini-time">${a.zone}</div>`;
        sidebarAlerts.appendChild(div);
      });
      if (!alerts.length) {
        sidebarAlerts.innerHTML = '<div style="font-size:12px;color:#94A3B8;text-align:center;padding:20px">暂无异常</div>';
      }
    }
  }

  function highlightZone(zoneId) {
    if (selectedZone === zoneId) {
      selectedZone = null;
      redraw();
      return;
    }
    selectedZone = zoneId;
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) return;

    ZONES.forEach(z => {
      const g = svg.querySelector(`.zone-group[data-zone-id="${z.id}"]`);
      if (!g) return;
      const rect = g.querySelector('rect');
      if (!rect) return;
      if (z.id === zoneId) {
        rect.setAttribute('stroke', '#FFFFFF');
        rect.setAttribute('stroke-width', '3');
        rect.setAttribute('filter', 'url(#glow)');
      } else {
        rect.setAttribute('opacity', '0.3');
      }
    });

    showZoneDetail(zone);
  }

  function showZoneDetail(zone) {
    const devices = zoneDevices[zone.id] || [];
    const personnel = zonePersonnel[zone.id] || [];
    const online = devices.filter(d => d.status === 'online').length;
    const idle = devices.filter(d => d.status === 'idle').length;
    const warning = devices.filter(d => d.status === 'warning').length;
    const fault = devices.filter(d => d.status === 'fault').length;

    showPersonnelModal({
      title: zone.name,
      subtitle: zone.shortName,
      sections: [
        {
          label: '区域概览',
          items: [
            { label: '设备总数', value: devices.length },
            { label: '运行中', value: online, color: '#1677FF' },
            { label: '空闲', value: idle, color: '#52C41A' },
            { label: '预警', value: warning, color: '#FAAD14' },
            { label: '故障', value: fault, color: '#FF4D4F' },
            { label: '人员', value: personnel.length }
          ]
        },
        {
          label: '人员列表',
          list: personnel.map(p => ({
            name: p.name,
            status: p.statusLabel,
            color: PERSONNEL_STATUS[p.status].color
          }))
        }
      ],
      zoneId: zone.id,
      isZone: true
    });
  }

  function showDeviceDetail(device) {
    const zone = ZONES.find(z => z.id === device.zoneId);
    showPersonnelModal({
      title: device.name,
      subtitle: device.id,
      sections: [
        {
          label: '设备信息',
          items: [
            { label: '编号', value: device.id },
            { label: '所属区域', value: zone ? zone.name : '-' },
            { label: '状态', value: device.statusLabel, color: STATUS_CONFIG[device.status].color },
            { label: '运行时长', value: `${Math.floor(Math.random() * 500 + 50)}h` }
          ]
        }
      ]
    });
  }

  function showPersonnelDetail(person, zone) {
    showPersonnelModal({
      title: person.name,
      subtitle: person.id,
      sections: [
        {
          label: '人员信息',
          items: [
            { label: '工号', value: person.id },
            { label: '所属区域', value: zone ? zone.name : '-' },
            { label: '状态', value: person.statusLabel, color: PERSONNEL_STATUS[person.status].color },
            { label: '技能', value: ['机加工', '装配', '质检', '调试'][Math.floor(Math.random() * 4)] }
          ]
        }
      ]
    });
  }

  function setupPersonnelModal() {
    let modal = document.getElementById('personnelModal');
    if (modal) {
      personnelDetailModal = modal;
      return;
    }

    modal = document.createElement('div');
    modal.id = 'personnelModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;z-index:9998';
    modal.innerHTML = `
      <div style="background:var(--bg-card,#151C2C);border:1px solid var(--border-color,#2A3550);border-radius:12px;width:90%;max-width:480px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
        <div id="modalHeader" style="padding:16px 20px;border-bottom:1px solid var(--border-color,#2A3550);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div id="modalTitle" style="font-size:16px;font-weight:600;color:var(--text-primary,#E2E8F0)"></div>
            <div id="modalSubtitle" style="font-size:12px;color:var(--text-muted,#8B95A8);margin-top:2px"></div>
          </div>
          <button id="modalClose" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;border-radius:4px;display:flex">
            <i data-lucide="x" style="width:20px;height:20px"></i>
          </button>
        </div>
        <div id="modalBody" style="padding:20px;overflow-y:auto;flex:1"></div>
        <div id="modalFooter" style="padding:14px 20px;border-top:1px solid var(--border-color,#2A3550);display:flex;justify-content:flex-end;gap:10px"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) hidePersonnelModal();
    });

    const closeBtn = modal.querySelector('#modalClose');
    if (closeBtn) closeBtn.addEventListener('click', hidePersonnelModal);

    personnelDetailModal = modal;
  }

  function showPersonnelModal(data) {
    if (!personnelDetailModal) setupPersonnelModal();
    if (!personnelDetailModal) return;

    const modal = personnelDetailModal;
    modal.style.display = 'flex';

    const title = modal.querySelector('#modalTitle');
    const subtitle = modal.querySelector('#modalSubtitle');
    const body = modal.querySelector('#modalBody');
    const footer = modal.querySelector('#modalFooter');

    title.textContent = data.title;
    subtitle.textContent = data.subtitle || '';

    let html = '';
    if (data.sections) {
      data.sections.forEach(section => {
        html += `<div style="margin-bottom:20px">`;
        html += `<div style="font-size:12px;color:var(--text-muted,#8B95A8);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:600">${section.label}</div>`;

        if (section.items) {
          html += `<div style="display:flex;flex-direction:column;gap:2px">`;
          section.items.forEach(item => {
            const colorStyle = item.color ? `color:${item.color}` : '';
            html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-color,#2A3550);font-size:13px">`;
            html += `<span style="color:var(--text-secondary,#94A3B8)">${item.label}</span>`;
            html += `<span style="color:var(--text-primary,#E2E8F0);font-weight:500;${colorStyle}">${item.value}</span>`;
            html += `</div>`;
          });
          html += `</div>`;
        }

        if (section.list) {
          html += `<div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">`;
          section.list.forEach(item => {
            html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(22,119,255,0.05);border-radius:6px;font-size:13px">`;
            html += `<div style="width:8px;height:8px;border-radius:50%;background:${item.color};flex-shrink:0"></div>`;
            html += `<span style="color:var(--text-primary,#E2E8F0);flex:1">${item.name}</span>`;
            html += `<span style="color:${item.color};font-size:12px">${item.status}</span>`;
            html += `</div>`;
          });
          html += `</div>`;
        }

        html += `</div>`;
      });
    }

    if (data.zoneId) {
      footer.innerHTML = `<button id="modalCloseBtn" style="padding:8px 18px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:var(--brand-primary,#1677FF);color:white">关闭</button>`;
    } else {
      footer.innerHTML = `<button id="modalCloseBtn" style="padding:8px 18px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:var(--bg-hover,#1A2335);color:var(--text-primary,#E2E8F0)">关闭</button>`;
    }
    const closeBtn = footer.querySelector('#modalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', hidePersonnelModal);

    body.innerHTML = html;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function hidePersonnelModal() {
    if (personnelDetailModal) {
      personnelDetailModal.style.display = 'none';
    }
  }

  function showTooltipAt(event, html) {
    if (!tooltip) {
      tooltip = document.getElementById('mapTooltip');
    }
    if (!tooltip) return;
    const container = document.getElementById('campus-svg-container');
    const rect = container.getBoundingClientRect();
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (event.clientY - rect.top + 12) + 'px';
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  function redraw() {
    selectedZone = null;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    drawFloor();
    setupInteractions();
    applyTransform();
  }

  function applyTransform() {
    if (svg) {
      const transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
      svg.style.transform = transform;
      svg.style.transformOrigin = '0 0';
    }
  }

  function updateZoomLabel() {
    const label = document.getElementById('zoomLevel');
    if (label) label.textContent = Math.round(zoomLevel * 100) + '%';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
