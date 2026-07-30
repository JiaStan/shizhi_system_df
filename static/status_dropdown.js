/* =========================
 * 状态下拉菜单（附近展开，不刷新页面）
 * ========================= */
var statusDropdownEl = null;
var statusBackdropEl = null;
var activeStatusProjectId = null;
var statusCloseTimer = null;

function ensureDropdownElements() {
  if (!statusBackdropEl) {
    statusBackdropEl = document.createElement('div');
    statusBackdropEl.id = 'statusBackdrop';
    statusBackdropEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;';
    statusBackdropEl.addEventListener('click', closeStatusDropdown);
    document.body.appendChild(statusBackdropEl);
  }
  if (!statusDropdownEl) {
    statusDropdownEl = document.createElement('div');
    statusDropdownEl.id = 'statusDropdown';
    statusDropdownEl.style.cssText = 'position:fixed;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:99999;min-width:110px;overflow:hidden;opacity:0;transform:translateY(-4px);transition:opacity 0.15s,transform 0.15s;display:none;';
    statusDropdownEl.addEventListener('click', function(e) { e.stopPropagation(); });
    document.body.appendChild(statusDropdownEl);
  }
}

function toggleStatusDropdown(projectId, currentStatus) {
  ensureDropdownElements();

  if (activeStatusProjectId === projectId) {
    closeStatusDropdown();
    return;
  }

  closeStatusDropdown();
  activeStatusProjectId = projectId;

  var all = [
    { n: '进行中', c: '#2563eb' },
    { n: '已暂停', c: '#ca8a04' },
    { n: '已完成', c: '#22c55e' },
    { n: '已取消', c: '#94a3b8' },
  ];

  var html = '';
  for (var i = 0; i < all.length; i++) {
    var s = all[i];
    var isCurrent = s.n === currentStatus;
    html += '<div onclick="applyStatusChange(' + projectId + ',\'' + s.n + '\')" style="padding:8px 14px;cursor:pointer;font-size:13px;color:' + s.c + ';' + (isCurrent ? 'background:rgba(59,130,246,0.06);font-weight:600;' : '') + 'transition:background 0.12s;" onmouseover="this.style.backgroundColor=\'rgba(0,0,0,0.04)\'" onmouseout="this.style.backgroundColor=\'' + (isCurrent ? 'rgba(59,130,246,0.06)' : 'transparent') + '\'">' + s.n + (isCurrent ? ' <span style="font-size:11px;opacity:0.6;">当前</span>' : '') + '</div>';
  }
  statusDropdownEl.innerHTML = html;

  var tagEl = document.getElementById('proj-status-' + projectId);
  if (tagEl) {
    var rect = tagEl.getBoundingClientRect();
    statusDropdownEl.style.top = (rect.bottom + 4) + 'px';
    statusDropdownEl.style.left = rect.left + 'px';
  }

  if (statusCloseTimer) { clearTimeout(statusCloseTimer); statusCloseTimer = null; }
  statusBackdropEl.style.display = 'block';
  statusDropdownEl.style.display = 'block';
  requestAnimationFrame(function() {
    statusDropdownEl.style.opacity = '1';
    statusDropdownEl.style.transform = 'translateY(0)';
  });
}

function closeStatusDropdown() {
  if (statusCloseTimer) { clearTimeout(statusCloseTimer); statusCloseTimer = null; }
  if (statusDropdownEl) {
    statusDropdownEl.style.opacity = '0';
    statusDropdownEl.style.transform = 'translateY(-4px)';
    statusCloseTimer = setTimeout(function() {
      statusCloseTimer = null;
      if (statusDropdownEl) statusDropdownEl.style.display = 'none';
    }, 150);
  }
  if (statusBackdropEl) {
    statusBackdropEl.style.display = 'none';
  }
  activeStatusProjectId = null;
}

function applyStatusChange(projectId, newStatus) {
  closeStatusDropdown();
  apiPut('/projects/' + projectId, { status: newStatus }).then(function(res) {
    if (res && res._error) { alert('更新失败：' + res.detail); return; }

    var tagEl = document.getElementById('proj-status-' + projectId);
    if (!tagEl) return;

    var sCol = '#2563eb', sBg = 'rgba(59,130,246,0.1)';
    if (newStatus === '已完成') { sCol = '#22c55e'; sBg = 'rgba(34,197,94,0.1)'; }
    else if (newStatus === '已暂停') { sCol = '#ca8a04'; sBg = 'rgba(234,179,8,0.1)'; }
    else if (newStatus === '已取消') { sCol = '#94a3b8'; sBg = 'rgba(148,163,184,0.1)'; }

    tagEl.textContent = newStatus;
    tagEl.style.background = sBg;
    tagEl.style.borderColor = sCol;
    tagEl.style.color = sCol;
    tagEl.setAttribute('onclick', 'event.stopPropagation();event.preventDefault();toggleStatusDropdown(' + projectId + ',\'' + newStatus + '\')');

    if (typeof loadProjectList === 'function') {
      loadProjectList();
    }
  }).catch(function(err) { alert('请求错误：' + err); });
}