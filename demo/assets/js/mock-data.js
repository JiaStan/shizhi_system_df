window.MockData = (function () {
  const AREAS = [
    { id: 'SZA', name: '装配一期车间', fullName: '装配一期车间(试制岛产线)', location: '总院A区', lifts: '试制岛产线', capacity: '2个项目或单项目B类当量40台', manager: '范潇' },
    { id: 'SZB', name: '装配二期车间', fullName: '装配二期车间', location: '总院B区', lifts: '6台举升机', capacity: '2个项目或单项目B类当量24台', manager: '邢浩然' },
    { id: 'SZC', name: '仓库装配区', fullName: '仓库装配区', location: '总院仓库', lifts: '5台举升机', capacity: '单项目B类当量20台', manager: '王鹏' },
    { id: 'JP1', name: '竞品装配一区', fullName: '竞品装配一区', location: '竞品区1', lifts: '3台举升机', capacity: '单项目B类当量12台', manager: '李思贤' },
    { id: 'JP2', name: '竞品装配二区', fullName: '竞品装配二区', location: '竞品区2', lifts: '4台举升机', capacity: '单项目B类当量16台', manager: '李思贤' },
    { id: 'LH', name: '联合装配区', fullName: '联合装配区', location: '联合区', lifts: '3-5台举升机', capacity: '单项目B类当量12台', manager: '金执' },
    { id: 'CX1', name: '外委装配区(畅行正东和泰)', fullName: '外委装配区', location: '外委区1', lifts: '13台举升机', capacity: '2个项目或单项目B类当量52台', manager: '外委' },
    { id: 'CX2', name: '外委装配区(畅行交石)', fullName: '外委装配区', location: '外委区2', lifts: '11台举升机', capacity: '2个项目或单项目B类当量44台', manager: '外委' }
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
      const areaIndex = i < 10 ? 0 : (i < 20 ? 1 : (i < 30 ? 2 : (i < 38 ? 3 : (i < 44 ? 4 : (i < 48 ? 5 : (i < 50 ? 6 : 7))))));
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

  const REAL_PROJECTS = [
    { id: 'PRJ-001', name: 'S33ET0', code: 'S33ET0', category: 'A类', totalQty: 71, status: '执行中', location: 'SZA', progress: 60, startDate: '2026-07-01', endDate: '2026-10-31', assignee: '陈寅', description: 'S33平台ET0试制项目，总装71台' },
    { id: 'PRJ-002', name: 'DH3', code: 'DH3', category: 'C类', totalQty: 3, status: '执行中', location: 'SZC', progress: 30, startDate: '2026-07-15', endDate: '2026-08-31', assignee: '陈兵', description: 'DH3车型试制，共3台' },
    { id: 'PRJ-003', name: 'DH1 BEV', code: 'DH1 BEV', category: 'C类', totalQty: 17, status: '执行中', location: 'SZC', progress: 10, startDate: '2026-07-20', endDate: '2026-09-30', assignee: '陈文都', description: 'DH1纯电动版试制，共17台' },
    { id: 'PRJ-004', name: 'S3R', code: 'S3R', category: 'B类', totalQty: 13, status: '执行中', location: 'SZC', progress: 15, startDate: '2026-08-01', endDate: '2026-10-31', assignee: '何建宁', description: 'S3R改款试制，共13台' },
    { id: 'PRJ-005', name: 'S595bH', code: 'S595bH', category: 'B类', totalQty: 4, status: '已完成', location: 'SZB', progress: 100, startDate: '2026-06-01', endDate: '2026-07-15', assignee: '黎睿', description: 'S595bH华为版试制，共4台' },
    { id: 'PRJ-006', name: '乐高骡子车', code: '乐高骡子车', category: 'C类', totalQty: 3, status: '已完成', location: 'SZB', progress: 100, startDate: '2026-06-15', endDate: '2026-07-31', assignee: '屈新田', description: '乐高平台骡子车试制，共3台' },
    { id: 'PRJ-007', name: 'E70换代', code: 'E70换代', category: 'C类', totalQty: 12, status: '已完成', location: 'SZB', progress: 100, startDate: '2026-07-01', endDate: '2026-08-31', assignee: '马宏滨', description: 'E70换代车型试制，共12台' },
    { id: 'PRJ-008', name: 'P4J', code: 'P4J', category: 'A类', totalQty: 11, status: '执行中', location: 'SZB', progress: 45, startDate: '2026-07-15', endDate: '2026-10-31', assignee: '肖高峰', description: 'P4J平台试制，共11台' },
    { id: 'PRJ-009', name: 'S-P（NX1）', code: 'S-P（NX1）', category: 'B类', totalQty: 5, status: '执行中', location: 'SZB', progress: 20, startDate: '2026-08-01', endDate: '2026-10-31', assignee: '待定', description: 'S-P平台NX1项目试制，共5台' },
    { id: 'PRJ-010', name: 'DH1BEV', code: 'DH1BEV', category: 'C类', totalQty: 8, status: '已完成', location: 'JP1', progress: 100, startDate: '2026-06-15', endDate: '2026-08-31', assignee: '陈文都', description: 'DH1纯电动版竞品区试制，共8台' },
    { id: 'PRJ-011', name: 'S597', code: 'S597', category: 'C类', totalQty: 4, status: '执行中', location: 'JP2', progress: 25, startDate: '2026-07-15', endDate: '2026-09-30', assignee: '黎睿', description: 'S597车型试制，共4台' },
    { id: 'PRJ-012', name: '轮毂电机', code: '轮毂电机', category: 'C类', totalQty: 26, status: '执行中', location: 'LH', progress: 50, startDate: '2026-07-01', endDate: '2026-10-31', assignee: '待定', description: '轮毂电机项目试制，共26台' },
    { id: 'PRJ-013', name: 'NX1（MPV）', code: 'NX1（MPV）', category: 'C类', totalQty: 8, status: '已完成', location: 'LH', progress: 100, startDate: '2026-06-01', endDate: '2026-07-31', assignee: '盛俏', description: 'NX1 MPV车型试制，共8台' },
    { id: 'PRJ-014', name: 'M18-3b', code: 'M18-3b', category: 'C类', totalQty: 10, status: '已延期', location: 'CX1', progress: 35, startDate: '2026-07-01', endDate: '2026-08-31', assignee: '待定', description: 'M18-3b车型外委试制，共10台' },
    { id: 'PRJ-015', name: 'M18-3RHW(右舵)', code: 'M18-3RHW(右舵)', category: 'C类', totalQty: 3, status: '已完成', location: 'CX1', progress: 100, startDate: '2026-07-15', endDate: '2026-08-31', assignee: '刘佳', description: 'M18-3右舵版外委试制，共3台' },
    { id: 'PRJ-016', name: 'J4J', code: 'J4J', category: 'C类', totalQty: 3, status: '已完成', location: 'CX1', progress: 100, startDate: '2026-06-15', endDate: '2026-07-31', assignee: '待定', description: 'J4J车型外委试制，共3台' },
    { id: 'PRJ-017', name: 'DH1海外', code: 'DH1海外', category: 'C类', totalQty: 7, status: '已完成', location: 'CX1', progress: 100, startDate: '2026-06-15', endDate: '2026-07-31', assignee: '待定', description: 'DH1海外版外委试制，共7台' },
    { id: 'PRJ-018', name: 'P57巴西海外', code: 'P57巴西海外', category: 'C类', totalQty: 4, status: '已完成', location: 'CX1', progress: 100, startDate: '2026-07-01', endDate: '2026-08-15', assignee: '待定', description: 'P57巴西版外委试制，共4台' },
    { id: 'PRJ-019', name: 'S596b', code: 'S596b', category: 'C类', totalQty: 1, status: '已延期', location: 'CX2', progress: 40, startDate: '2026-07-01', endDate: '2026-08-15', assignee: '待定', description: 'S596b车型外委试制，共1台' },
    { id: 'PRJ-020', name: 'G59 ICE年型海外', code: 'G59 ICE年型海外', category: 'C类', totalQty: 4, status: '执行中', location: 'CX2', progress: 30, startDate: '2026-07-15', endDate: '2026-09-15', assignee: '李清平', description: 'G59 ICE年型海外版外委试制，共4台' },
    { id: 'PRJ-021', name: 'S73b换电版', code: 'S73b换电版', category: 'B类', totalQty: 12, status: '执行中', location: 'CX2', progress: 35, startDate: '2026-07-15', endDate: '2026-09-30', assignee: '蔡志伟', description: 'S73b换电版外委试制，共12台' },
    { id: 'PRJ-022', name: 'G35海外', code: 'G35海外', category: 'C类', totalQty: 10, status: '已延期', location: 'CX2', progress: 55, startDate: '2026-06-15', endDate: '2026-08-31', assignee: '刘小杰', description: 'G35海外版外委试制，共10台' },
    { id: 'PRJ-023', name: 'P57巴西海外(第二批)', code: 'P57巴西海外', category: 'C类', totalQty: 10, status: '执行中', location: 'CX2', progress: 20, startDate: '2026-08-01', endDate: '2026-10-31', assignee: '待定', description: 'P57巴西海外版第二批外委试制，共10台' }
  ];

  const REAL_STATS = {
    totalProjects: 23,
    categoryA: 2,
    categoryB: 4,
    categoryC: 17,
    totalUnits: 241,
    inProgress: 12,
    completed: 8,
    delayed: 3
  };

  function generateTasks() {
    const tasks = [];
    for (let i = 0; i < REAL_PROJECTS.length; i++) {
      const p = REAL_PROJECTS[i];
      let taskType;
      if (p.category === 'A类') taskType = 'A类任务';
      else if (p.category === 'B类') taskType = 'B类任务';
      else taskType = 'C类任务';

      let priority;
      if (p.category === 'A类') priority = '紧急';
      else if (p.category === 'B类') priority = '高';
      else priority = '中';

      let status;
      if (p.status === '已完成') status = '已完成';
      else if (p.status === '已延期') status = '已延期';
      else if (p.progress >= 100) status = '已完成';
      else if (p.progress <= 0) status = '待执行';
      else status = '执行中';

      tasks.push({
        id: 'TASK-' + padZero(i + 1),
        code: p.code,
        name: p.name,
        title: p.name,
        type: taskType,
        priority: priority,
        status: status,
        progress: p.progress,
        area: p.location,
        assignee: p.assignee,
        device: 'DEV-' + padZero(Math.floor(Math.random() * 50) + 1),
        startDate: p.startDate,
        endDate: p.endDate,
        createdAt: p.startDate + ' 09:00:00',
        description: p.description,
        totalQty: p.totalQty,
        category: p.category
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
        totalTasks: REAL_PROJECTS.length,
        completedTasks: REAL_STATS.completed,
        inProgressTasks: REAL_STATS.inProgress,
        pendingTasks: 0,
        delayedTasks: REAL_STATS.delayed,
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
        labels: ['A类任务', 'B类任务', 'C类任务'],
        values: [REAL_STATS.categoryA, REAL_STATS.categoryB, REAL_STATS.categoryC]
      },
      alertLevel: {
        labels: ['严重', '高', '中', '低'],
        values: [2, 5, 5, 3]
      },
      areaComparison: {
        areas: AREAS.map(a => a.name),
        devices: [10, 10, 10, 8, 6, 4, 4, 4],
        utilization: [78, 72, 70, 74, 68, 65, 70, 72],
        tasks: [3, 3, 3, 2, 1, 2, 3, 3]
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
    statusMap: STATUS_MAP,
    REAL_DATA: {
      projects: REAL_PROJECTS,
      stats: REAL_STATS,
      areas: AREAS
    }
  };

  return {
    data: data,
    refresh: function () {
      data.devices = generateDevices();
      data.personnel = generatePersonnel();
      data.tasks = generateTasks();
      data.alerts = generateAlerts();
      data.stats = generateStats();
      data.REAL_DATA = {
        projects: REAL_PROJECTS,
        stats: REAL_STATS,
        areas: AREAS
      };
      return data;
    }
  };
})();