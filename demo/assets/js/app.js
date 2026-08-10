window.App = (function () {
  const toastStack = [];
  let toastSeq = 0;

  const NAV_MODULES = [
    { key: 'dashboard', name: '综合驾驶舱', icon: 'layout-dashboard', url: 'dashboard.html' },
    { key: 'devices', name: '设备台账', icon: 'cpu', url: 'equipment.html' },
    { key: 'resource', name: '资源占用看板', icon: 'bar-chart-3', url: 'resource-board.html' },
    { key: 'gantt', name: '甘特图排程', icon: 'gantt', url: 'gantt.html' },
    { key: 'tasks', name: '任务管理', icon: 'list-checks', url: 'tasks.html' },
    { key: 'personnel', name: '人员看板', icon: 'users', url: 'personnel.html' },
    { key: 'efficiency', name: '人效分析', icon: 'trending-up', url: 'efficiency.html' },
    { key: 'campus', name: '园区地图', icon: 'map', url: 'campus-map.html' },
    { key: 'alerts', name: '异常预警中心', icon: 'alert-triangle', url: 'alerts.html' }
  ];

  function renderNav(activePage) {
    const navContainer = document.querySelector('.nav-menu');
    if (!navContainer) return;

    const activeKey = activePage || (document.querySelector('[data-page].active')?.dataset.page);

    navContainer.innerHTML = NAV_MODULES.map(mod => {
      const isActive = mod.key === activeKey;
      return `<li class="nav-item ${isActive ? 'active' : ''}" data-page="${mod.key}" data-url="${mod.url}">
        <i data-lucide="${mod.icon}" class="nav-icon"></i>
        <span>${mod.name}</span>
      </li>`;
    }).join('');

    navContainer.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const url = item.dataset.url;
        if (url) window.location.href = url;
      });
    });

    if (window.lucide) window.lucide.createIcons({ attrs: { class: ['lucide'] } });
  }

  function toast(message, type = 'success', title) {
    const container = getToastContainer();
    const icons = {
      success: '<i data-lucide="check-circle"></i>',
      error: '<i data-lucide="xcircle"></i>',
      warning: '<i data-lucide="alert-triangle"></i>',
      info: '<i data-lucide="info"></i>'
    };
    const titles = {
      success: title || '操作成功',
      error: title || '操作失败',
      warning: title || '提示',
      info: title || '提示'
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-body">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <span class="close-btn"><i data-lucide="x"></i></span>
    `;
    const id = ++toastSeq;
    el.dataset.id = id;
    container.appendChild(el);
    if (window.lucide) window.lucide.createIcons({ attrs: { class: ['lucide'] } });
    setTimeout(() => {
      el.style.transition = 'all 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(30px)';
      setTimeout(() => el.remove(), 300);
    }, 3000);
    el.querySelector('.close-btn').addEventListener('click', () => el.remove());
  }

  function getToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    document.body.style.overflow = '';
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-mask.show').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
  }

  function initSelect(selectWrap, onChange) {
    const wrap = typeof selectWrap === 'string' ? document.querySelector(selectWrap) : selectWrap;
    if (!wrap || wrap.dataset.init === '1') return;
    wrap.dataset.init = '1';
    const select = wrap.querySelector('select');
    const trigger = document.createElement('div');
    trigger.className = 'select-trigger';
    const panel = document.createElement('div');
    panel.className = 'select-panel';
    const options = Array.from(select.options);
    options.forEach((opt, idx) => {
      const o = document.createElement('div');
      o.className = 'select-option';
      o.dataset.value = opt.value;
      o.textContent = opt.textContent;
      if (opt.selected) o.classList.add('selected');
      if (idx === 0 && opt.value === '') trigger.textContent = opt.textContent;
      o.addEventListener('click', (e) => {
        e.stopPropagation();
        select.value = opt.value;
        trigger.textContent = opt.textContent;
        panel.querySelectorAll('.select-option').forEach(x => x.classList.remove('selected'));
        o.classList.add('selected');
        wrap.classList.remove('open');
        if (onChange) onChange(opt.value);
        select.dispatchEvent(new Event('change'));
      });
      panel.appendChild(o);
      if (opt.selected) trigger.textContent = opt.textContent;
    });
    wrap.appendChild(trigger);
    wrap.appendChild(panel);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.select-wrap.open').forEach(w => { if (w !== wrap) w.classList.remove('open'); });
      wrap.classList.toggle('open');
    });

    document.addEventListener('click', () => wrap.classList.remove('open'));
  }

  function initAllSelects(container = document) {
    container.querySelectorAll('.select-wrap').forEach(w => initSelect(w));
  }

  function openConfirm({ title = '确认操作', message = '确定要执行此操作吗？', onConfirm }) {
    const mask = document.createElement('div');
    mask.className = 'modal-mask show';
    mask.innerHTML = `
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--danger-soft);color:var(--danger);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i data-lucide="alert-triangle" style="width:22px;height:22px;"></i>
            </div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${message}</div>
              <div style="font-size:12px;color:var(--text-secondary);">此操作不可撤销，请谨慎确认。</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost btn-cancel">取消</button>
          <button class="btn btn-danger btn-ok">确认删除</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);
    if (window.lucide) window.lucide.createIcons({ attrs: { class: ['lucide'] } });
    const close = () => { mask.classList.remove('show'); setTimeout(() => mask.remove(), 300); };
    mask.querySelector('.modal-close').addEventListener('click', close);
    mask.querySelector('.btn-cancel').addEventListener('click', close);
    mask.querySelector('.btn-ok').addEventListener('click', () => {
      close();
      if (onConfirm) onConfirm();
    });
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  }

  const api = { toast, openModal, closeModal, closeAllModals, initSelect, initAllSelects, openConfirm, renderNav, NAV_MODULES };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderNav();
    });
  } else {
    renderNav();
  }

  return api;
})();
