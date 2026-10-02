/* Fictional, session-only data for the offline V3 demonstration. */
const FleetV3Data = (() => {
  const roles = {
    user: '普通用户',
    leader: '部门负责人',
    director: '车管中心主任',
    chief: '车辆中心处长',
    driver: '司机班',
    mechanic: '修理工',
    garage: '修理厂',
    system: '系统管理员'
  };

  const create = (day, at) => ({
    roles,
    departments: [
      { id: 'd1', name: '刑侦支队', leader: 'u2' },
      { id: 'd2', name: '治安支队', leader: 'u11' },
      { id: 'd3', name: '交警支队', leader: 'u12' },
      { id: 'd4', name: '警务保障处', leader: 'u10' }
    ],
    users: [
      { id: 'u1', name: '张三', account: 'zhangsan', department: 'd1', phone: '13800000001', roles: ['user'], status: 'active' },
      { id: 'u2', name: '刘梅', account: 'liumei', department: 'd1', phone: '13800000002', roles: ['user', 'leader'], status: 'active' },
      { id: 'u3', name: '陈伟', account: 'chenwei', department: 'd4', phone: '13800000003', roles: ['user', 'director'], status: 'active' },
      { id: 'u4', name: '赵处', account: 'zhaochu', department: 'd4', phone: '13800000004', roles: ['user', 'director', 'chief'], status: 'active' },
      { id: 'u5', name: '孙师傅', account: 'sunban', department: 'd4', phone: '13800000005', roles: ['user', 'driver'], status: 'active' },
      { id: 'u6', name: '吴工', account: 'xiaowu', department: 'd4', phone: '13800000006', roles: ['user', 'mechanic'], status: 'active' },
      { id: 'u7', name: '周工', account: 'zhougong', department: 'd4', phone: '13800000007', roles: ['user', 'mechanic'], status: 'active' },
      { id: 'u8', name: '海星汽修', account: 'haixing', department: 'external', phone: '03350000008', roles: ['garage'], garageName: '海星汽车维修有限公司', status: 'active' },
      { id: 'u9', name: '鑫达汽修', account: 'xinda', department: 'external', phone: '03350000009', roles: ['garage'], garageName: '鑫达汽车服务中心', status: 'active' },
      { id: 'u10', name: '王敏', account: 'wangmin', department: 'd4', phone: '13800000010', roles: Object.keys(roles), status: 'active' },
      { id: 'u11', name: '李晴', account: 'liqing', department: 'd2', phone: '13800000011', roles: ['user', 'leader'], status: 'active' },
      { id: 'u12', name: '高峰', account: 'gaofeng', department: 'd3', phone: '13800000012', roles: ['user', 'leader'], status: 'active' },
      { id: 'u13', name: '周宁', account: 'zhouning', department: 'd3', phone: '13800000013', roles: ['user'], status: 'active' },
      { id: 'u14', name: '李航', account: 'lihang', department: 'd2', phone: '13800000014', roles: ['user'], status: 'active' }
    ].map((user) => ({ ...user, password: 'Demo123!' })),
    vehicles: [
      { id: 'v1', plate: '冀C·A1026', model: '大众途观', type: 'SUV', nature: '警车', seats: 5, unit: '市局', status: '使用中', condition: '良好', inspection: day(160), insurance: day(190) },
      { id: 'v2', plate: '冀C·B2088', model: '别克GL8', type: '商务车', nature: '便车', seats: 7, unit: '市局', status: '空闲', condition: '良好', inspection: day(180), insurance: day(210) },
      { id: 'v3', plate: '冀C·C3066', model: '大众帕萨特', type: '轿车', nature: '便车', seats: 5, unit: '市局', status: '空闲', condition: '良好', inspection: day(110), insurance: day(140) },
      { id: 'v4', plate: '冀C·D5102', model: '丰田柯斯达', type: '客车', nature: '警车', seats: 20, unit: '市局', status: '空闲', condition: '良好', inspection: day(90), insurance: day(100) },
      { id: 'v5', plate: '冀C·E6079', model: '福特全顺', type: '货车', nature: '警车', seats: 3, unit: '市局', status: '异常待处理', condition: '仍需观察', inspection: day(70), insurance: day(120) },
      { id: 'v6', plate: '冀C·F8021', model: '北京现代', type: '轿车', nature: '警车', seats: 5, unit: '市局', status: '空闲', condition: '待检修', inspection: day(130), insurance: day(150) },
      { id: 'v7', plate: '冀C·G9018', model: '特种保障车', type: '其他', nature: '特殊车辆', seats: 6, unit: '市局', status: '空闲', condition: '良好', inspection: day(200), insurance: day(230) },
      { id: 'v8', plate: '冀C·H7788', model: '江铃皮卡', type: '货车', nature: '便车', seats: 5, unit: '市局', status: '停用', condition: '异常', inspection: day(-10), insurance: day(80) },
      { id: 'v9', plate: '冀C·J3865', model: '哈弗H9', type: 'SUV', nature: '警车', seats: 5, unit: '市局', status: '空闲', condition: '良好', inspection: day(150), insurance: day(180) }
    ],
    trips: [
      { id: 'YC3001', user: 'u1', department: 'd1', type: 'ordinary', purpose: '现场走访', destination: '海港区', start: at(1, '09:00'), end: at(1, '23:59'), preferredType: 'SUV', assignedType: 'SUV', status: 'driver_pending', vehicle: null, events: [{ stage: 'apply', text: '提交普通用车申请', time: at(-1, '09:10'), actor: 'u1' }, { stage: 'leader', text: '部门负责人同意', time: at(-1, '10:00'), actor: 'u2' }, { stage: 'director', text: '车管中心主任确定车型：SUV', time: at(-1, '10:30'), actor: 'u3' }] },
      { id: 'YC3002', user: 'u1', department: 'd1', type: 'ordinary', purpose: '案件材料移交', destination: '开发区', start: at(0, '08:00'), end: at(0, '23:59'), preferredType: 'SUV', assignedType: 'SUV', status: 'using', vehicle: 'v1', pickupAt: at(0, '08:10'), events: [{ stage: 'apply', text: '提交普通用车申请', time: at(-1, '14:00'), actor: 'u1' }, { stage: 'leader', text: '部门负责人同意', time: at(-1, '14:20'), actor: 'u2' }, { stage: 'director', text: '车管中心主任确定车型：SUV', time: at(-1, '14:40'), actor: 'u3' }, { stage: 'driver', text: '司机班派车：冀C·A1026', time: at(0, '08:10'), actor: 'u5' }, { stage: 'use', text: '申请人领取钥匙并开始用车', time: at(0, '08:12'), actor: 'u1' }] },
      { id: 'YC3003', user: 'u1', department: 'd1', type: 'travel', purpose: '跨区业务交流', destination: '昌黎县', start: at(-1, '08:00'), end: at(-1, '23:59'), preferredType: '轿车', assignedType: '轿车', status: 'done', vehicle: 'v1', returnedAt: at(-1, '18:10'), returnPhotos: ['front-demo', 'rear-demo'], events: [{ stage: 'apply', text: '提交出差用车申请', time: at(-3, '09:00'), actor: 'u1' }, { stage: 'leader', text: '部门负责人同意', time: at(-3, '09:25'), actor: 'u2' }, { stage: 'director', text: '车管中心主任确定车型：轿车', time: at(-3, '10:00'), actor: 'u3' }, { stage: 'chief', text: '车辆中心处长同意用车', time: at(-3, '10:20'), actor: 'u4' }, { stage: 'driver', text: '司机班派车：冀C·A1026', time: at(-1, '07:50'), actor: 'u5' }, { stage: 'use', text: '申请人领取钥匙并开始用车', time: at(-1, '08:00'), actor: 'u1' }, { stage: 'return_submit', text: '申请人提交归还，等待司机班确认', time: at(-1, '18:00'), actor: 'u1' }, { stage: 'return_confirm', text: '司机班确认归还', time: at(-1, '18:10'), actor: 'u5' }] },
      { id: 'YC3004', user: 'u14', department: 'd2', type: 'special', purpose: '大型活动保障', destination: '奥体中心', start: at(1, '07:30'), end: at(1, '23:59'), preferredType: '商务车', assignedType: '商务车', status: 'chief_pending', vehicle: null, events: [{ stage: 'apply', text: '提交特殊车辆申请', time: at(-1, '11:00'), actor: 'u14' }, { stage: 'leader', text: '部门负责人同意', time: at(-1, '11:20'), actor: 'u11' }, { stage: 'director', text: '车管中心主任确定车型：商务车', time: at(-1, '11:40'), actor: 'u3' }] },
      { id: 'YC3005', user: 'u13', department: 'd3', type: 'ordinary', purpose: '交通设施巡查', destination: '北戴河区', start: at(-2, '08:00'), end: at(-2, '23:59'), preferredType: '轿车', assignedType: '轿车', status: 'done', vehicle: 'v3', returnedAt: at(-2, '19:00'), returnPhotos: ['front-demo', 'rear-demo'], events: [{ stage: 'apply', text: '提交普通用车申请', time: at(-4, '09:00'), actor: 'u13' }, { stage: 'leader', text: '部门负责人同意', time: at(-4, '09:25'), actor: 'u12' }, { stage: 'director', text: '车管中心主任确定车型：轿车', time: at(-4, '10:00'), actor: 'u3' }, { stage: 'driver', text: '司机班派车：冀C·C3066', time: at(-2, '07:50'), actor: 'u5' }, { stage: 'use', text: '申请人领取钥匙并开始用车', time: at(-2, '08:00'), actor: 'u13' }, { stage: 'return_submit', text: '申请人提交归还，等待司机班确认', time: at(-2, '18:50'), actor: 'u13' }, { stage: 'return_confirm', text: '司机班确认归还', time: at(-2, '19:00'), actor: 'u5' }] }
    ],
    fuels: [
      { id: 'JY3001', user: 'u1', department: 'd1', vehicle: 'v1', trip: 'YC3003', amount: 320, fuelType: '92#汽油', time: at(-1, '16:20'), source: 'user', createdBy: 'u1' },
      { id: 'JY3002', user: 'u13', department: 'd3', vehicle: 'v3', trip: 'YC3005', amount: 280, fuelType: '95#汽油', time: at(-2, '14:30'), source: 'user', createdBy: 'u13' }
    ],
    repairs: [
      { id: 'WX3001', vehicle: 'v1', applicant: 'u6', issue: '定期保养', stopNow: false, status: 'done', garage: 'u8', quoteAmount: 1200, quoteItems: [{ name: '机油及滤芯更换', unit: '项', quantity: 1, unitPrice: 800, subtotal: 800 }, { name: '常规检查', unit: '项', quantity: 1, unitPrice: 400, subtotal: 400 }], actualAmount: 1200, result: '良好', createdAt: at(-20, '09:00'), events: [{ stage: 'apply', text: '修理工提交维修申请', time: at(-20, '09:00'), actor: 'u6' }, { stage: 'director_assign', text: '车管中心主任分派修理厂：海兴汽修', time: at(-20, '10:00'), actor: 'u3' }, { stage: 'quote', text: '海兴汽修提交报价：1200 元', time: at(-20, '14:00'), actor: 'u8' }, { stage: 'director_quote', text: '车管中心主任同意维修', time: at(-19, '09:20'), actor: 'u3' }, { stage: 'repairing', text: '海兴汽修完成维修，最终金额 1200 元', time: at(-18, '14:30'), actor: 'u8' }, { stage: 'acceptance', text: '修理工验车收车：良好', time: at(-18, '16:00'), actor: 'u6' }] },
      { id: 'WX3002', vehicle: 'v5', applicant: 'u7', issue: '车门外观损伤', stopNow: true, status: 'director_review', garage: 'u9', quoteAmount: 6800, quoteItems: [{ name: '车门钣金修复', unit: '项', quantity: 1, unitPrice: 2800, subtotal: 2800 }, { name: '车门喷漆', unit: '面', quantity: 2, unitPrice: 1500, subtotal: 3000 }, { name: '饰板及卡扣更换', unit: '套', quantity: 1, unitPrice: 1000, subtotal: 1000 }], quoteNote: '钣金喷漆及部件更换', quotePhoto: 'quote-demo', createdAt: at(-1, '10:00'), events: [{ stage: 'apply', text: '修理工立即停用并提交维修申请', time: at(-1, '10:00'), actor: 'u7' }, { stage: 'director_assign', text: '车管中心主任分派修理厂：鑫达汽修', time: at(-1, '11:00'), actor: 'u3' }, { stage: 'quote', text: '鑫达汽修提交报价：6800 元', time: at(-1, '15:00'), actor: 'u9' }] }
    ],
    notifications: [
      { id: 'N1', roles: ['director'], title: '待处理维修报价', text: '冀C·E6079 报价 6800 元', target: 'repair:WX3002', readBy: [], time: at(-1, '15:00') },
      { id: 'N2', users: ['u1'], title: '今日车辆使用中', text: '请在预计结束时间前归还车辆', target: 'trip:YC3002', readBy: [], time: at(0, '08:12') }
    ],
    logs: [],
    settings: { fileRetentionYears: 3, lastOverdueCheck: day(-1) }
  });

  return { roles, create };
})();

if (typeof module !== 'undefined') module.exports = FleetV3Data;
