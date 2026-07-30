window.MockData = (function () {
  const AREAS = [
    { id: 'A', name: 'A车间', fullName: 'A区装配车间', location: '1号厂房1层', manager: '张伟' },
    { id: 'B', name: 'B车间', fullName: 'B区焊接车间', location: '1号厂房2层', manager: '李强' },
    { id: 'C', name: 'C车间', fullName: 'C区喷涂车间', location: '2号厂房1层', manager: '王芳' },
    { id: 'D', name: 'D车间', fullName: 'D区总装车间', location: '2号厂房2层', manager: '刘洋' }
  ];

  const STATUS_MAP = {
    online: { label: '运行中', value: 'online' },
    offline: { label: '离线', value: 'offline' },
    warning: { label: '预警', value: 'warning' },
    maintenance: { label: '维护中', value: 'maintenance' },
    fault: { label: '故障', value: 'fault' },
    idle: { label: '空闲', value: 'idle' }
  };

  const DEVICE_MODELS = [
    'CNC-850', 'CNC-1160', 'VMC-850', 'VMC-1060', 'HMC-630',
    'HMC-800', 'TC-500', 'TC-630', 'MC-2500', 'MC-3000',
    'LW-20', 'LW-25', 'LW-30', 'P-500A', 'P-500B',
    'P-800', 'AGV-X1', 'AGV-X2', 'RB-6', 'RB-12',
    'WJ-100', 'WJ-200', 'HJ-500', 'HJ-600', 'FMS-A',
    'FMS-B', 'AS-RS5', 'AS-RS8', 'PV-1000', 'PV-2000'
  ];

  const DEVICE_NAMES = [
    '立式加工中心', '卧式加工中心', '五轴加工中心', '数控车床', '数控铣床',
    '激光切割机', '激光焊接机', '喷涂机器人', '装配机器人', '搬运机器人',
    'AGV搬运车', '自动化立体仓库', '冲压机', '液压机', '注塑机',
    '精密磨床', '精密镗床', '电火花机', '线切割机', '超声波清洗机',
    '自动点胶机', '自动螺丝机', '自动贴片机', '自动焊接产线', 'FMS柔性产线',
    '检测三坐标', '光学检测仪', '在线测量仪', '打标机', '切割机'
  ];

  function padZero(n) { return n < 10 ? '0' + n : '' + n; }

  function randomDate(start, end) {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return d.getFullYear() + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate()) + ' ' +
      padZero(d.getHours()) + ':' + padZero(d.getMinutes()) + ':' + padZero(d.getSeconds());
  }

  function generateDevices() {
    const devices = [];
    const statuses = ['online', 'online', 'online', 'online', 'online', 'idle', 'warning', 'maintenance', 'fault', 'offline'];
    for (let i = 1; i <= 50; i++) {
      const areaIndex = i < 15 ? 0 : (i < 28 ? 1 : (i < 40 ? 2 : 3));
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const lastMaintain = randomDate(new Date(2025, 0, 1), new Date(2026, 6, 30));
      const nextMaintain = randomDate(new Date(2026, 7, 1), new Date(2026, 12, 31));
      devices.push({
        id: 'DEV-' + padZero(i),
        name: DEVICE_NAMES[i % DEVICE_NAMES.length] + '#' + padZero(i),
        model: DEVICE_MODELS[i % DEVICE_MODELS.length],
        area: AREAS[areaIndex].id,
        status: status,
        statusLabel: STATUS_MAP[status].label,
        manager: AREAS[areaIndex].manager,
        runtime: Math.floor(Math.random() * 5000) + 200,
        utilization: Math.floor(Math.random() * 40) + 50,
        lastMaintain: lastMaintain,
        nextMaintain: nextMaintain,
        createdAt: randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31))
      });
    }
    return devices;
  }

  const SKILL_GROUPS = ['机械加工', '焊接', '喷涂', '装配', '检测', '物流', '电气维修', '机械维修'];
  const PERSON_NAMES = [
    '张伟', '李强', '王芳', '刘洋', '陈静', '杨帆', '赵磊', '黄敏',
    '周涛', '吴霞', '徐鹏', '孙丽', '胡军', '朱琳', '高峰', '林梅',
    '郭强', '何雪', '罗彬', '梁晨'
  ];

  function generatePersonnel() {
    const people = [];
    const positions = ['A区', 'B区', 'C区', 'D区', 'A区', 'B区', 'C区', 'D区', '总装', '质检'];
    const statuses = ['在岗', '在岗', '在岗', '在岗', '休假', '出差', '请假'];
    for (let i = 1; i <= 20; i++) {
      people.push({
        id: 'EMP-' + padZero(i),
        name: PERSON_NAMES[i - 1],
        skillGroup: SKILL_GROUPS[i % SKILL_GROUPS.length],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        position: positions[i - 1],
        phone: '138****' + padZero(1000 + i * 37).slice(-4),
        joinDate: randomDate(new Date(2020, 0, 1), new Date(2025, 11, 31)),
        avatar: PERSON_NAMES[i - 1].charAt(0)
      });
    }
    return people;
  }

  const TASK_TYPES = ['零星任务', 'ABC类任务', '试制岛任务'];
  const TASK_PRIORITIES = ['低', '中', '高', '紧急'];
  const TASK_STATUS_LIST = ['待执行', '执行中', '已完成', '已延期', '已取消'];
  const TASK_TITLES = [
    '零部件CNC加工', '外壳焊接组装', '表面喷涂处理', '整体装配', '成品检测',
    '备件更换', '日常保养', '设备维修', '模具调试', '工艺验证',
    '样品试制', '小批量生产', '质量整改', '技术改造', '紧急订单',
    '来料加工', '包装发运', '退货返工', '升级改造', '临时支援'
  ];

  function generateTasks() {
    const tasks = [];
    for (let i = 1; i <= 30; i++) {
      const typeIndex = i <= 10 ? 0 : (i <= 20 ? 1 : 2);
      const statusIndex = Math.floor(Math.random() * TASK_STATUS_LIST.length);
      const progress = TASK_STATUS_LIST[statusIndex] === '已完成' ? 100 :
        TASK_STATUS_LIST[statusIndex] === '待执行' ? 0 :
          Math.floor(Math.random() * 80) + 10;
      const startDate = randomDate(new Date(2026, 5, 1), new Date(2026, 6, 30));
      const endDate = randomDate(new Date(2026, 7, 1), new Date(2026, 11, 31));
      tasks.push({
        id: 'TASK-' + padZero(i),
        title: TASK_TITLES[i % TASK_TITLES.length] + ' - ' + padZero(i),
        type: TASK_TYPES[typeIndex],
        priority: TASK_PRIORITIES[Math.floor(Math.random() * TASK_PRIORITIES.length)],
        status: TASK_STATUS_LIST[statusIndex],
        progress: progress,
        area: AREAS[Math.floor(Math.random() * AREAS.length)].id,
        assignee: PERSON_NAMES[Math.floor(Math.random() * PERSON_NAMES.length)],
        device: 'DEV-' + padZero(Math.floor(Math.random() * 50) + 1),
        startDate: startDate,
        endDate: endDate,
        createdAt: randomDate(new Date(2026, 3, 1), new Date(2026, 5, 31))
      });
    }
    return tasks;
  }

  const ALERT_LEVELS = [
    { value: 'critical', label: '严重' },
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ];
  const ALERT_TYPES = ['设备故障', '质量异常', '安全隐患', '物料短缺', '人员异常', '环境监测'];
  const ALERT_MESSAGES = [
    '主轴温度过高，请立即检查',
    '刀具磨损已达临界值',
    '气压异常下降',
    '液压系统泄漏',
    '冷却系统故障',
    '电气柜温度异常',
    '工件尺寸超出公差',
    '表面质量不达标',
    '安全光幕触发',
    '急停按钮被按下',
    '原材料库存不足',
    '辅料即将耗尽',
    '操作人员超时作业',
    '非授权人员进入',
    '车间粉尘浓度超标',
    '噪音超过标准值'
  ];

  function generateAlerts() {
    const alerts = [];
    for (let i = 1; i <= 15; i++) {
      const levelIndex = Math.floor(Math.random() * ALERT_LEVELS.length);
      alerts.push({
        id: 'ALERT-' + padZero(i),
        level: ALERT_LEVELS[levelIndex].value,
        levelLabel: ALERT_LEVELS[levelIndex].label,
        type: ALERT_TYPES[i % ALERT_TYPES.length],
        message: ALERT_MESSAGES[i % ALERT_MESSAGES.length],
        device: 'DEV-' + padZero(Math.floor(Math.random() * 50) + 1),
        area: AREAS[Math.floor(Math.random() * AREAS.length)].id,
        status: Math.random() > 0.5 ? '未处理' : '处理中',
        assignee: PERSON_NAMES[Math.floor(Math.random() * PERSON_NAMES.length)],
        createdAt: randomDate(new Date(2026, 6, 15), new Date(2026, 6, 30))
      });
    }
    return alerts;
  }

  function generateStats() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return {
      kpi: {
        totalDevices: 50,
        onlineDevices: 35,
        offlineDevices: 3,
        warningDevices: 5,
        maintenanceDevices: 5,
        faultDevices: 2,
        avgUtilization: 73.5,
        totalTasks: 30,
        completedTasks: 12,
        inProgressTasks: 10,
        pendingTasks: 6,
        delayedTasks: 2,
        totalAlerts: 15,
        unresolvedAlerts: 8,
        personnelCount: 20,
        onlinePersonnel: 15
      },
      productionTrend: {
        months: months,
        planned: [1200, 1350, 1280, 1450, 1520, 1480],
        actual: [1150, 1320, 1260, 1420, 1490, 1460],
        completed: [1100, 1280, 1230, 1380, 1440, 1420]
      },
      deviceStatus: {
        labels: ['运行中', '空闲', '预警', '维护中', '故障', '离线'],
        values: [35, 8, 5, 5, 2, 3]
      },
      taskType: {
        labels: ['零星任务', 'ABC类任务', '试制岛任务'],
        values: [10, 20, 10]
      },
      alertLevel: {
        labels: ['严重', '高', '中', '低'],
        values: [2, 5, 5, 3]
      },
      areaComparison: {
        areas: AREAS.map(a => a.name),
        devices: [15, 13, 12, 10],
        utilization: [78, 72, 70, 74],
        tasks: [8, 7, 8, 7]
      },
      weeklyOutput: {
        days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        output: [240, 260, 255, 280, 275, 220, 180],
        quality: [98.5, 98.2, 98.7, 98.3, 98.6, 99.0, 99.2]
      }
    };
  }

  const data = {
    areas: AREAS,
    devices: generateDevices(),
    personnel: generatePersonnel(),
    tasks: generateTasks(),
    alerts: generateAlerts(),
    stats: generateStats(),
    statusMap: STATUS_MAP
  };

  return {
    data: data,
    refresh: function () {
      data.devices = generateDevices();
      data.personnel = generatePersonnel();
      data.tasks = generateTasks();
      data.alerts = generateAlerts();
      data.stats = generateStats();
      return data;
    }
  };
})();