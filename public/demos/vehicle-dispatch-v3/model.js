/* Business state machine for the offline V3 demonstration. */
const FleetV3 = (() => {
  const source = typeof module !== 'undefined' && module.exports ? require('./data.js') : FleetV3Data;
  const pad = (value) => String(value).padStart(2, '0');
  const day = (offset = 0, base = new Date()) => {
    const date = new Date(base);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const at = (offset, time) => `${day(offset)}T${time}`;
  const now = () => new Date().toLocaleString('zh-CN');
  const deepCopy = (value) => JSON.parse(JSON.stringify(value));

  let db;
  let current = null;
  let role = 'user';
  let serial = 4000;

  const accessMatrix = Object.freeze({
    user: ['trip', 'fuel'],
    leader: ['trip'],
    director: ['trip', 'fuel', 'repair', 'vehicles', 'imports', 'exports'],
    chief: ['trip', 'fuel', 'repair', 'vehicles', 'imports', 'exports'],
    driver: ['trip'],
    mechanic: ['repair'],
    garage: ['repair'],
    system: ['people', 'departments', 'logs']
  });
  const canAccess = (moduleName, roleName = role) => accessMatrix[roleName]?.includes(moduleName) || false;

  const seed = () => {
    db = deepCopy(source.create(day, at));
    serial = 4000;
  };
  seed();

  const user = (id) => db.users.find((item) => item.id === id);
  const department = (id) => db.departments.find((item) => item.id === id);
  const vehicle = (id) => db.vehicles.find((item) => item.id === id);
  const trip = (id) => db.trips.find((item) => item.id === id);
  const repair = (id) => db.repairs.find((item) => item.id === id);
  const hasRole = (wanted) => {
    if (!current || current.status !== 'active') return false;
    if (current.roles.includes('system')) return true;
    if (role === 'chief' && wanted === 'director') return true;
    return role === wanted && current.roles.includes(wanted);
  };
  const requireRole = (...wanted) => {
    if (!wanted.some(hasRole)) throw new Error('当前身份没有此操作权限');
  };
  const canViewTrip = (record) => {
    if (!record || !current) return false;
    if (role === 'user') return record.user === current.id;
    if (role === 'leader') return department(record.department)?.leader === current.id;
    if (role === 'driver') return ['driver_pending', 'assigned', 'using', 'return_pending', 'done'].includes(record.status);
    return ['director', 'chief', 'system'].includes(role);
  };
  const log = (action, object, detail = '') => {
    db.logs.unshift({ id: `LOG${serial++}`, time: now(), actor: current?.id || 'system', role, action, object, detail });
  };
  const event = (record, stage, text, extra = {}) => {
    record.events ||= [];
    record.events.push({ stage, text, time: now(), actor: current?.id || 'system', ...extra });
    log(text, record.id);
  };
  const updateDepartmentLeader = (departmentId, leaderId) => {
    requireRole('system');
    const targetDepartment = department(departmentId);
    const candidate = user(leaderId);
    if (!targetDepartment) throw new Error('部门不存在');
    if (!candidate || candidate.status !== 'active') throw new Error('请选择在职人员');
    if (candidate.department !== departmentId) throw new Error('负责人必须属于该部门');
    if (!candidate.roles.includes('leader')) candidate.roles.push('leader');
    targetDepartment.leader = candidate.id;
    log('更新部门负责人', targetDepartment.name, `负责人：${candidate.name}`);
    return targetDepartment;
  };
  const createDepartment = (name) => {
    requireRole('system');
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('请填写部门名称');
    if (db.departments.some((item) => item.name === normalized)) throw new Error('部门名称已存在');
    const created = { id: `d${serial++}`, name: normalized, leader: null };
    db.departments.push(created);
    log('新增部门', normalized, '初始未绑定负责人');
    return created;
  };
  const deleteDepartment = (departmentId) => {
    requireRole('system');
    const targetDepartment = department(departmentId);
    if (!targetDepartment) throw new Error('部门不存在');
    if (db.users.some((item) => item.department === departmentId && item.status === 'active')) throw new Error('该部门仍有在职人员，不能删除');
    if (db.trips.some((item) => item.department === departmentId)) throw new Error('该部门仍有历史用车单，不能删除');
    db.departments = db.departments.filter((item) => item.id !== departmentId);
    log('删除部门', targetDepartment.name, '无人员、无用车记录');
    return targetDepartment;
  };
  const updateUserAccess = (userId, values = {}) => {
    requireRole('system');
    const target = user(userId);
    const roles = Array.isArray(values.roles) ? [...new Set(values.roles)] : [];
    if (!target) throw new Error('人员不存在');
    if (!roles.length || roles.some((item) => !Object.hasOwn(source.roles, item))) throw new Error('请至少选择一个有效角色');
    if (!['active', 'inactive', 'pending'].includes(values.status)) throw new Error('请选择有效账号状态');
    if (db.departments.some((item) => item.leader === target.id) && (!roles.includes('leader') || values.status !== 'active')) throw new Error('该人员是固定部门负责人，请先在部门管理中更换负责人');
    const removingLastSystem = target.roles.includes('system') && target.status === 'active' && (!roles.includes('system') || values.status !== 'active') && db.users.filter((item) => item.status === 'active' && item.roles.includes('system')).length <= 1;
    if (removingLastSystem) throw new Error('至少保留一名启用状态的系统管理员');
    target.roles = roles;
    target.status = values.status;
    log('更新账号权限', target.name, `角色：${roles.join('/')}；状态：${values.status}`);
    return target;
  };
  const resetUserPassword = (userId) => {
    requireRole('system');
    const target = user(userId);
    if (!target) throw new Error('人员不存在');
    target.password = 'Demo123!';
    log('重置账号密码', target.name, '已重置为演示初始密码');
    return target;
  };
  const notify = ({ roles, users, title, text, target }) => {
    db.notifications.unshift({ id: `N${serial++}`, roles, users, title, text, target, readBy: [], time: now() });
  };
  const login = (account, password, wechat = false) => {
    const found = db.users.find((item) => item.account === account);
    if (!found || (!wechat && found.password !== password)) throw new Error('账号或密码不正确');
    if (found.status !== 'active') throw new Error('账号尚未启用');
    current = found;
    role = found.roles.includes('user') ? 'user' : found.roles[0];
    return found;
  };
  const switchRole = (next) => {
    if (!current) throw new Error('请先登录');
    if (!current.roles.includes(next) && !current.roles.includes('system')) throw new Error('当前账号没有该身份');
    role = next;
    return role;
  };
  const validTime = (start, end) => {
    if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || start >= end) throw new Error('预计结束时间必须晚于开始时间');
  };
  const tripFlow = (record) => {
    if (!record) return [];
    const nodes = [
      ['apply', '提交用车申请'],
      ['leader', '部门负责人审批'],
      ['director', '车管中心主任定车型'],
      ...(record.type === 'ordinary' ? [] : [['chief', '车辆中心处长审批']]),
      ['driver', '司机班确定车牌 / 发放钥匙'],
      ['using', '申请人领取钥匙并开始用车'],
      ['return_submit', '申请人提交车辆归还'],
      ['return_confirm', '司机班确认归还']
    ];
    const currentByStatus = {
      dept_pending: 'leader', director_pending: 'director', chief_pending: 'chief',
      driver_pending: 'driver', assigned: 'using', using: 'return_submit', return_pending: 'return_confirm'
    };
    const currentId = currentByStatus[record.status];
    if (record.status === 'done') return nodes.map(([id, title]) => ({ id, title, state: 'done' }));
    const completedStages = new Set((record.events || []).map((item) => item.stage));
    if (completedStages.has('return')) {
      if (record.status === 'return_pending') completedStages.add('return_submit');
      if (record.status === 'done') { completedStages.add('return_submit'); completedStages.add('return_confirm'); }
    }
    const currentIndex = nodes.findIndex(([id]) => id === currentId);
    return nodes.map(([id, title], index) => {
      if (record.status === 'rejected' || record.status === 'cancelled') {
        const actionStage = (record.events || []).at(-1)?.stage || 'apply';
        if (id === actionStage) return { id, title, state: record.status };
        return { id, title, state: completedStages.has(id) ? 'done' : 'upcoming' };
      }
      if (currentIndex >= 0) return { id, title, state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming' };
      return { id, title, state: completedStages.has(id) ? 'done' : 'upcoming' };
    });
  };
  const repairFlow = (record) => {
    if (!record) return [];
    const needsChiefQuote = Number(record.quoteAmount) > 5000 || record.status === 'chief_review' || (record.events || []).some((item) => item.stage === 'chief_quote');
    const needsFinalReview = record.actualAmount !== undefined && record.actualAmount !== null && record.actualAmount !== record.quoteAmount || ['director_final_review', 'chief_final_review'].includes(record.status) || (record.events || []).some((item) => ['director_final', 'chief_final'].includes(item.stage));
    const needsChiefFinal = Number(record.actualAmount) > 5000 || record.status === 'chief_final_review' || (record.events || []).some((item) => item.stage === 'chief_final');
    const nodes = [
      ['apply', '修理工提交维修申请'],
      ['director_assign', '车管中心主任分派修理厂'],
      ['quote', '修理厂提交报价单'],
      ['director_quote', '车管中心主任审核报价'],
      ...(needsChiefQuote ? [['chief_quote', '车辆中心处长审核报价']] : []),
      ['repairing', '修理厂实施维修'],
      ...(needsFinalReview ? [['director_final', '车管中心主任复核最终金额']] : []),
      ...(needsFinalReview && needsChiefFinal ? [['chief_final', '车辆中心处长复核最终金额']] : []),
      ['acceptance', '修理工验车收车']
    ];
    const currentByStatus = {
      pending_assignment: 'director_assign', quote_pending: 'quote', director_review: 'director_quote',
      chief_review: 'chief_quote', repairing: 'repairing', director_final_review: 'director_final',
      chief_final_review: 'chief_final', acceptance: 'acceptance'
    };
    if (record.status === 'done') return nodes.map(([id, title]) => ({ id, title, state: 'done' }));
    const currentId = currentByStatus[record.status];
    const currentIndex = nodes.findIndex(([id]) => id === currentId);
    const completedAliases = new Set((record.events || []).map((item) => ({ director: 'director_quote', chief: 'chief_quote', garage: 'repairing', accept: 'acceptance' }[item.stage] || item.stage)));
    return nodes.map(([id, title], index) => {
      if (record.status === 'rejected') return { id, title, state: completedAliases.has(id) ? 'done' : 'upcoming' };
      if (currentIndex >= 0) return { id, title, state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming' };
      return { id, title, state: completedAliases.has(id) ? 'done' : 'upcoming' };
    });
  };
  const vehicleAvailable = (item, start, end, excludeTrip) => {
    if (!item || item.status !== '空闲' || !['良好', '仍需观察'].includes(item.condition)) return false;
    return !db.trips.some((record) => record.id !== excludeTrip && record.vehicle === item.id && ['assigned', 'using', 'return_pending'].includes(record.status) && record.start < end && start < record.end);
  };
  const availableVehicleCounts = (record) => {
    const counts = { '轿车': 0, SUV: 0, '商务车': 0, '客车': 0, '货车': 0, '其他': 0 };
    if (!record?.start || !record?.end) return counts;
    db.vehicles.forEach((item) => {
      if (Object.hasOwn(counts, item.type) && vehicleAvailable(item, record.start, record.end, record.id)) counts[item.type] += 1;
    });
    return counts;
  };

  const createTrip = (values) => {
    requireRole('user');
    validTime(values.start, values.end);
    if (!['ordinary', 'travel', 'special'].includes(values.type)) throw new Error('请选择正确的用车类型');
    if (!values.purpose?.trim() || !values.destination?.trim()) throw new Error('请填写用车事由和目的地');
    const record = {
      id: `YC${serial++}`,
      user: current.id,
      department: current.department,
      type: values.type,
      purpose: values.purpose.trim(),
      destination: values.destination.trim(),
      start: values.start,
      end: values.end,
      preferredType: values.preferredType || '',
      passengers: values.passengers || '',
      note: values.note || '',
      assignedType: null,
      vehicle: null,
      status: 'dept_pending',
      events: []
    };
    db.trips.unshift(record);
    event(record, 'apply', `提交${({ ordinary: '普通用车', travel: '出差用车', special: '特殊车辆' })[record.type]}申请`);
    const leader = department(record.department)?.leader;
    notify({ users: leader ? [leader] : [], title: '新的用车申请', text: `${current.name}：${record.purpose}`, target: `trip:${record.id}` });
    return record;
  };

  const tripAction = (id, action, values = {}) => {
    const record = trip(id);
    if (!record) throw new Error('用车申请不存在');
    if (action === 'deptApprove') {
      requireRole('leader');
      if (department(record.department)?.leader !== current.id) throw new Error('只能审批本部门申请');
      if (record.status !== 'dept_pending') throw new Error('当前状态不能进行部门审批');
      record.status = 'director_pending';
      event(record, 'leader', '部门负责人同意');
      notify({ roles: ['director', 'chief'], title: '待确定用车车型', text: record.purpose, target: `trip:${id}` });
    } else if (action === 'directorApprove') {
      requireRole('director');
      if (record.status !== 'director_pending') throw new Error('当前状态不能由主任处理');
      if (!values.assignedType) throw new Error('请确定分配车型');
      if (!(availableVehicleCounts(record)[values.assignedType] > 0)) throw new Error('当前时段无可用车辆，请选择其他车型');
      record.assignedType = values.assignedType;
      event(record, 'director', `确定车型：${values.assignedType}`);
      if (record.type === 'ordinary') record.status = 'driver_pending';
      else if (role === 'chief') {
        record.status = 'driver_pending';
        event(record, 'chief', '车辆中心处长审批自动通过', { auto: true });
      } else {
        record.status = 'chief_pending';
        notify({ roles: ['chief'], title: '待车辆中心处长审批用车', text: record.purpose, target: `trip:${id}` });
      }
      if (record.status === 'driver_pending') notify({ roles: ['driver'], title: '待司机班派车', text: record.purpose, target: `trip:${id}` });
    } else if (action === 'chiefApprove') {
      requireRole('chief');
      if (record.status !== 'chief_pending') throw new Error('当前状态不能由车辆中心处长审批');
      record.status = 'driver_pending';
      event(record, 'chief', '车辆中心处长同意用车');
      notify({ roles: ['driver'], title: '待司机班派车', text: record.purpose, target: `trip:${id}` });
    } else if (action === 'reject') {
      if (record.status === 'dept_pending') requireRole('leader');
      else if (record.status === 'director_pending') requireRole('director');
      else if (record.status === 'chief_pending') requireRole('chief');
      else throw new Error('当前状态不能驳回');
      if (!values.reason?.trim()) throw new Error('请填写驳回原因');
      record.status = 'rejected';
      record.reason = values.reason.trim();
      event(record, role, `驳回申请：${record.reason}`);
      notify({ users: [record.user], title: '用车申请未通过', text: record.reason, target: `trip:${id}` });
    } else if (action === 'driverAssign') {
      requireRole('driver');
      if (record.status !== 'driver_pending') throw new Error('当前状态不能派车');
      const car = vehicle(values.vehicle);
      if (!car) throw new Error('请选择车辆');
      if (car.type !== record.assignedType && !values.adjustReason?.trim()) throw new Error('更换车型必须填写调整原因');
      if (!vehicleAvailable(car, record.start, record.end, record.id)) throw new Error('所选车辆当前不可派');
      record.vehicle = car.id;
      record.adjustReason = values.adjustReason?.trim() || '';
      record.status = 'assigned';
      car.status = '已安排';
      event(record, 'driver', `司机班派车：${car.plate}${record.adjustReason ? `；调整原因：${record.adjustReason}` : ''}`);
      notify({ users: [record.user], title: '车辆已经安排', text: `${car.plate} · ${car.model}`, target: `trip:${id}` });
    } else if (action === 'start') {
      requireRole('user');
      if (record.user !== current.id || record.status !== 'assigned') throw new Error('不能开始此用车单');
      record.status = 'using';
      record.pickupAt = now();
      vehicle(record.vehicle).status = '使用中';
      event(record, 'use', '领取钥匙并开始用车');
    } else if (action === 'submitReturn') {
      requireRole('user');
      if (record.user !== current.id || record.status !== 'using') throw new Error('不能提交此车辆归还');
      if (!Array.isArray(values.photos) || values.photos.length < 2) throw new Error('必须上传车辆前后照片');
      record.returnPhotos = values.photos.slice(0, 2);
      record.mileage = values.mileage || '';
      record.status = 'return_pending';
      event(record, 'return_submit', '提交归还，等待司机班确认');
      notify({ roles: ['driver'], title: '待确认车辆归还', text: vehicle(record.vehicle).plate, target: `trip:${id}` });
    } else if (action === 'confirmReturn') {
      requireRole('driver');
      if (record.status !== 'return_pending') throw new Error('当前状态不能确认归还');
      const exterior = values.exterior || '正常';
      const hygiene = values.hygiene || '良好';
      const parts = values.parts || '完整';
      const abnormal = exterior !== '正常' || hygiene !== '良好' || parts !== '完整';
      if (abnormal && !values.note?.trim()) throw new Error('车辆异常时必须填写说明');
      record.returnCheck = { exterior, hygiene, parts, fuelLevel: values.fuelLevel || '其他', note: values.note || '', receiver: current.id };
      record.returnedAt = now();
      record.status = 'done';
      const car = vehicle(record.vehicle);
      car.status = abnormal ? '异常待处理' : '空闲';
      car.condition = abnormal ? '异常' : car.condition;
      event(record, 'return_confirm', abnormal ? '确认归还并登记车况异常' : '司机班确认归还');
      if (abnormal) log('生成车况异常记录', car.plate, values.note || '归还检查异常');
    } else if (action === 'cancel') {
      requireRole('user');
      if (record.user !== current.id || record.status !== 'dept_pending') throw new Error('只能取消尚未处理的本人申请');
      record.status = 'cancelled';
      event(record, 'cancel', '用户取消申请');
    } else throw new Error('未知用车操作');
    return record;
  };

  const eligibleFuelVehicles = (userId, date = day()) => {
    const anchor = new Date(`${date}T12:00:00`);
    const previous = day(-1, anchor);
    const ids = new Set(db.trips.filter((record) => record.user === userId && record.vehicle && (record.status === 'using' || [date, previous].includes(record.start.slice(0, 10)) || [date, previous].includes(String(record.returnedAt || '').slice(0, 10)))).map((record) => record.vehicle));
    return db.vehicles.filter((item) => ids.has(item.id));
  };
  const visibleFuelRecords = () => {
    if (!current) return [];
    if (role === 'user') return db.fuels.filter((item) => item.user === current.id);
    requireRole('director');
    return db.fuels;
  };
  const eligibleDispatchVehicles = (record) => {
    if (!record?.assignedType) return [];
    return db.vehicles.filter((item) => item.type === record.assignedType && vehicleAvailable(item, record.start, record.end, record.id));
  };

  const fuelAction = (action, values) => {
    if (!vehicle(values.vehicle)) throw new Error('车辆不存在');
    if (!Number.isFinite(+values.amount) || +values.amount <= 0) throw new Error('请填写正确的加油金额');
    if (!values.fuelType || !values.time) throw new Error('请填写油号和加油时间');
    let owner = current;
    let sourceType;
    if (action === 'add') {
      requireRole('user');
      if (!eligibleFuelVehicles(current.id, String(values.time).slice(0, 10)).some((item) => item.id === values.vehicle)) throw new Error('不能登记非本人当天或前一天使用的车辆');
      sourceType = 'user';
    } else if (action === 'supplement') {
      requireRole('director');
      if (!values.reason?.trim()) throw new Error('补登必须填写说明');
      owner = values.user ? user(values.user) : current;
      sourceType = 'supplement';
    } else throw new Error('未知加油操作');
    const related = db.trips.find((record) => record.user === owner.id && record.vehicle === values.vehicle && record.start.slice(0, 10) <= String(values.time).slice(0, 10) && record.end.slice(0, 10) >= String(values.time).slice(0, 10));
    const record = { id: `JY${serial++}`, user: owner.id, department: owner.department, vehicle: values.vehicle, trip: related?.id || null, amount: +values.amount, fuelType: values.fuelType, time: values.time, source: sourceType, reason: values.reason || '', createdBy: current.id, createdAt: now() };
    db.fuels.unshift(record);
    log(sourceType === 'user' ? '登记加油' : '补登加油', vehicle(values.vehicle).plate, `${record.amount}元`);
    return record;
  };

  const createRepair = (values) => {
    requireRole('mechanic');
    if (!vehicle(values.vehicle) || !values.issue?.trim()) throw new Error('请选择车辆并填写维修需求');
    const record = { id: `WX${serial++}`, vehicle: values.vehicle, applicant: current.id, issue: values.issue.trim(), stopNow: !!values.stopNow, status: 'pending_assignment', garage: null, createdAt: now(), events: [] };
    db.repairs.unshift(record);
    if (record.stopNow) {
      vehicle(record.vehicle).status = '维修申请中';
      vehicle(record.vehicle).condition = '待检修';
    }
    event(record, 'apply', `${record.stopNow ? '立即停用并' : ''}提交维修申请`);
    notify({ roles: ['director', 'chief'], title: '新的维修申请', text: vehicle(record.vehicle).plate, target: `repair:${record.id}` });
    return record;
  };

  const repairAction = (id, action, values = {}) => {
    const record = repair(id);
    if (!record) throw new Error('维修申请不存在');
    const car = vehicle(record.vehicle);
    const chiefAuto = (nextStatus) => {
      record.status = nextStatus;
      event(record, 'chief', '车辆中心处长审批自动通过', { auto: true });
    };
    if (action === 'assignGarage') {
      requireRole('director');
      const garage = user(values.garage);
      if (record.status !== 'pending_assignment' || !garage?.roles.includes('garage')) throw new Error('请选择有效修理厂');
      record.garage = garage.id;
      record.status = 'quote_pending';
      car.status = '维修中';
      event(record, 'director', `分派修理厂：${garage.garageName || garage.name}`);
      notify({ users: [garage.id], title: '新的维修报价任务', text: car.plate, target: `repair:${id}` });
    } else if (action === 'submitQuote') {
      requireRole('garage');
      if (record.status !== 'quote_pending' || record.garage !== current.id) throw new Error('不能为此任务报价');
      let quoteItems = values.quoteItems;
      if (typeof quoteItems === 'string') {
        try { quoteItems = JSON.parse(quoteItems); } catch (_) { throw new Error('报价明细格式不正确'); }
      }
      if (!Array.isArray(quoteItems) || !quoteItems.length || !values.photo) throw new Error('请填写报价明细并上传报价单照片');
      const normalizedItems = quoteItems.map((item) => {
        const name = String(item?.name || '').trim();
        const unit = String(item?.unit || '').trim();
        const quantity = Number(item?.quantity);
        const unitPrice = Number(item?.unitPrice);
        if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('请完整填写每一项报价明细');
        return { name, unit, quantity, unitPrice, subtotal: +(quantity * unitPrice).toFixed(2) };
      });
      record.quoteItems = normalizedItems;
      record.quoteAmount = +normalizedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2);
      record.quoteNote = values.note || '';
      record.quotePhoto = values.photo;
      record.status = 'director_review';
      event(record, 'quote', `修理厂报价 ${record.quoteAmount} 元`);
    } else if (action === 'directorDecision') {
      requireRole('director');
      if (record.status !== 'director_review') throw new Error('当前不在主任报价审核阶段');
      const decision = values.decision;
      if (decision === 'requote') {
        record.status = 'quote_pending';
        event(record, 'director', `打回重新报价：${values.reason || ''}`);
      } else if (decision === 'change') {
        const nextGarage = user(values.garage);
        if (!nextGarage?.roles.includes('garage')) throw new Error('请选择新的修理厂');
        record.garage = nextGarage.id;
        record.status = 'quote_pending';
        event(record, 'director', `更换修理厂：${nextGarage.garageName || nextGarage.name}`);
      } else if (decision === 'reject') {
        if (!values.reason?.trim()) throw new Error('直接驳回必须填写原因');
        record.status = 'rejected';
        record.reason = values.reason.trim();
        car.status = record.stopNow ? '异常待处理' : '空闲';
        event(record, 'director', `驳回并终结：${record.reason}`);
      } else if (decision === 'approve') {
        if (record.quoteAmount > 5000 && role !== 'chief') throw new Error('超过5000元必须上送车辆中心处长');
        if (record.quoteAmount > 5000 && role === 'chief') chiefAuto('repairing');
        else {
          record.status = 'repairing';
          event(record, 'director', '主任同意维修');
        }
      } else if (decision === 'escalate') {
        if (role === 'chief') chiefAuto('repairing');
        else {
          record.status = 'chief_review';
          event(record, 'director', '上送车辆中心处长审核');
          notify({ roles: ['chief'], title: '待审批维修报价', text: `${car.plate} · ${record.quoteAmount}元`, target: `repair:${id}` });
        }
      } else throw new Error('请选择主任处理结果');
    } else if (action === 'chiefDecision') {
      requireRole('chief');
      if (record.status !== 'chief_review') throw new Error('当前不在车辆中心处长审批阶段');
      if (values.decision === 'approve') {
        record.status = 'repairing';
        event(record, 'chief', '车辆中心处长同意维修');
      } else if (values.decision === 'requote') {
        record.status = 'quote_pending';
        event(record, 'chief', `车辆中心处长打回重新报价：${values.reason || ''}`);
      } else if (values.decision === 'change') {
        record.status = 'pending_assignment';
        record.garage = null;
        event(record, 'chief', '退回主任重新选择修理厂');
      } else if (values.decision === 'reject') {
        if (!values.reason?.trim()) throw new Error('直接驳回必须填写原因');
        record.status = 'rejected';
        record.reason = values.reason.trim();
        car.status = record.stopNow ? '异常待处理' : '空闲';
        event(record, 'chief', `车辆中心处长驳回并终结：${record.reason}`);
      } else throw new Error('请选择车辆中心处长处理结果');
    } else if (action === 'complete') {
      requireRole('garage');
      if (record.status !== 'repairing' || record.garage !== current.id) throw new Error('不能完成此维修任务');
      if (!Number.isFinite(+values.actualAmount) || +values.actualAmount <= 0 || !values.content?.trim() || !values.proof) throw new Error('请填写完工内容、最终金额并上传凭证');
      record.actualAmount = +values.actualAmount;
      record.actualContent = values.content.trim();
      record.proof = values.proof;
      record.status = record.actualAmount === record.quoteAmount ? 'acceptance' : 'director_final_review';
      event(record, 'garage', `维修完成，最终金额 ${record.actualAmount} 元`);
    } else if (action === 'directorFinal') {
      requireRole('director');
      if (record.status !== 'director_final_review') throw new Error('当前不在最终金额审核阶段');
      if (values.decision === 'reject') {
        record.status = 'repairing';
        event(record, 'director', `最终金额退回：${values.reason || ''}`);
      } else if (values.decision === 'approve') {
        if (record.actualAmount > 5000 && role !== 'chief') throw new Error('最终金额超过5000元必须上送车辆中心处长');
        if (record.actualAmount > 5000 && role === 'chief') chiefAuto('acceptance');
        else {
          record.status = 'acceptance';
          event(record, 'director', '主任同意最终金额');
        }
      } else if (values.decision === 'escalate') {
        if (role === 'chief') chiefAuto('acceptance');
        else {
          record.status = 'chief_final_review';
          event(record, 'director', '最终金额上送车辆中心处长');
        }
      } else throw new Error('请选择最终金额处理结果');
    } else if (action === 'chiefFinal') {
      requireRole('chief');
      if (record.status !== 'chief_final_review') throw new Error('当前不在车辆中心处长最终金额审核阶段');
      if (values.decision === 'approve') {
        record.status = 'acceptance';
        event(record, 'chief', '车辆中心处长同意最终金额');
      } else if (values.decision === 'reject') {
        record.status = 'repairing';
        event(record, 'chief', `车辆中心处长退回最终金额：${values.reason || ''}`);
      } else throw new Error('请选择车辆中心处长处理结果');
    } else if (action === 'accept') {
      requireRole('mechanic');
      if (record.status !== 'acceptance') throw new Error('当前不能验车收车');
      if (!['良好', '仍需观察', '维修未通过'].includes(values.result)) throw new Error('请选择验车结果');
      record.result = values.result;
      record.receiver = current.id;
      if (values.result === '维修未通过') {
        record.status = 'repairing';
        car.status = '维修中';
        car.condition = '待检修';
        event(record, 'accept', '维修未通过，退回修理厂');
      } else {
        record.status = 'done';
        car.status = '空闲';
        car.condition = values.result;
        event(record, 'accept', `修理工验车：${values.result}`);
      }
    } else throw new Error('未知维修操作');
    return record;
  };

  const vehicleLedger = (vehicleId) => {
    const rows = [];
    db.trips.filter((item) => item.vehicle === vehicleId).forEach((item) => rows.push({ kind: 'trip', time: item.start, title: item.purpose, status: item.status, id: item.id }));
    db.fuels.filter((item) => item.vehicle === vehicleId).forEach((item) => rows.push({ kind: 'fuel', time: item.time, title: `${item.fuelType} · ${item.amount}元`, status: item.source, id: item.id }));
    db.repairs.filter((item) => item.vehicle === vehicleId).forEach((item) => rows.push({ kind: 'repair', time: item.createdAt, title: item.issue, status: item.status, id: item.id }));
    return rows.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  };

  const previewVehicleImport = (rows) => {
    requireRole('director', 'chief');
    const preview = { adds: [], updates: [], errors: [] };
    (Array.isArray(rows) ? rows : []).forEach((sourceRow, index) => {
      const row = {
        plate: String(sourceRow.plate || '').trim(),
        model: String(sourceRow.model || '').trim(),
        type: String(sourceRow.type || '').trim(),
        nature: String(sourceRow.nature || '').trim(),
        seats: +(sourceRow.seats || 5),
        unit: String(sourceRow.unit || '市局').trim(),
        status: String(sourceRow.status || '空闲').trim(),
        condition: String(sourceRow.condition || '良好').trim(),
        inspection: String(sourceRow.inspection || ''),
        insurance: String(sourceRow.insurance || '')
      };
      if (!row.plate || !row.model || !row.type || !row.nature) preview.errors.push({ row: index + 2, message: '车牌号、车型、车辆性质和型号均为必填项', data: row });
      else if (db.vehicles.some((item) => item.plate === row.plate)) preview.updates.push(row);
      else preview.adds.push(row);
    });
    return preview;
  };

  const applyVehicleImport = (preview) => {
    requireRole('director', 'chief');
    (preview.updates || []).forEach((row) => Object.assign(db.vehicles.find((item) => item.plate === row.plate), row));
    (preview.adds || []).forEach((row) => db.vehicles.push({ id: `v${serial++}`, ...row }));
    log('批量导入车辆', '车辆档案', `新增${preview.adds?.length || 0}，更新${preview.updates?.length || 0}，错误${preview.errors?.length || 0}`);
    return { added: preview.adds?.length || 0, updated: preview.updates?.length || 0, errors: preview.errors?.length || 0 };
  };

  const exportRows = (kind) => {
    if (kind === 'trips') return db.trips.map((item) => ({ 编号: item.id, 申请人: user(item.user)?.name, 部门: department(item.department)?.name, 用车类型: item.type, 事由: item.purpose, 车牌: vehicle(item.vehicle)?.plate || '', 状态: item.status }));
    if (kind === 'vehicles') return db.vehicles.map((item) => ({ 车牌号: item.plate, 车型: item.type, 车辆性质: item.nature, 型号: item.model, 状态: item.status, 车况: item.condition }));
    if (kind === 'fuels') return db.fuels.map((item) => ({ 时间: item.time, 用车人: user(item.user)?.name, 车牌号: vehicle(item.vehicle)?.plate, 金额: item.amount, 油号: item.fuelType, 来源: item.source }));
    if (kind === 'repairs') return db.repairs.map((item) => ({ 编号: item.id, 车牌号: vehicle(item.vehicle)?.plate, 维修事项: item.issue, 报价: item.quoteAmount || '', 最终金额: item.actualAmount || '', 状态: item.status }));
    if (kind === 'departments') return db.departments.map((item) => {
      const records = db.trips.filter((tripItem) => tripItem.department === item.id);
      return { 部门: item.name, 部门负责人: user(item.leader)?.name || '', 申请数量: records.length, 完成数量: records.filter((tripItem) => tripItem.status === 'done').length, 使用中: records.filter((tripItem) => ['assigned', 'using', 'return_pending'].includes(tripItem.status)).length };
    });
    if (kind === 'logs') { requireRole('system'); return db.logs.map((item) => ({ 时间: item.time, 操作人: user(item.actor)?.name || item.actor, 操作: item.action, 对象: item.object, 说明: item.detail })); }
    return [];
  };

  const notifications = () => db.notifications.filter((item) => {
    if (!current) return false;
    const direct = item.users?.includes(current.id) || false;
    const activeRole = item.roles?.includes(role) || (role === 'chief' && item.roles?.includes('director')) || false;
    const publicNotice = !item.users?.length && !item.roles?.length;
    return direct || activeRole || publicNotice;
  });
  const unreadNotifications = () => notifications().filter((item) => !item.readBy.includes(current.id));
  const markRead = (id) => {
    const item = db.notifications.find((entry) => entry.id === id);
    if (item && current && !item.readBy.includes(current.id)) item.readBy.push(current.id);
  };

  return {
    roles: source.roles,
    accessMatrix,
    canAccess,
    canViewTrip,
    availableVehicleCounts,
    day,
    at,
    user,
    department,
    vehicle,
    trip,
    repair,
    tripFlow,
    repairFlow,
    login,
    switchRole,
    requireRole,
    createTrip,
    tripAction,
    eligibleFuelVehicles,
    visibleFuelRecords,
    eligibleDispatchVehicles,
    fuelAction,
    createRepair,
    repairAction,
    vehicleLedger,
    previewVehicleImport,
    applyVehicleImport,
    updateDepartmentLeader,
    createDepartment,
    deleteDepartment,
    updateUserAccess,
    resetUserPassword,
    exportRows,
    notifications,
    unreadNotifications,
    markRead,
    get db() { return db; },
    get current() { return current; },
    get role() { return role; },
    logout() { current = null; role = 'user'; },
    reset() { seed(); current = user('u10'); role = 'user'; return db; }
  };
})();

if (typeof module !== 'undefined') module.exports = FleetV3;
