const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../public/demos/vehicle-dispatch-v3');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

// 原离线包是 CommonJS；主站是 ESM。保持运行资源原样，测试单独加载。
function loadModel() {
  const Module = require('node:module');
  const data = new Module(path.join(root, 'data.js'));
  data._compile(read('data.js'), path.join(root, 'data.js'));
  const model = new Module(path.join(root, 'model.js'));
  model.require = (name) => {
    assert.equal(name, './data.js');
    return data.exports;
  };
  model._compile(read('model.js'), path.join(root, 'model.js'));
  return model.exports;
}

test('V3 独立离线包包含手机微信小程序外壳', () => {
  const html = read('index.html');
  const css = read('style.css');
  assert.match(html, /车辆调度 Demo V3\.0/);
  assert.match(html, /class="phone"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /max-width:\s*414px/);
  for (const script of ['data.js', 'model.js', 'app.js']) assert.match(html, new RegExp(`src="${script.replace('.', '\\.')}"`));
});

test('运行文件没有网络依赖或浏览器持久化', () => {
  const names = ['index.html', 'style.css', 'refinements.css', 'data.js', 'model.js', 'app.js'];
  const runtime = names.map(read).join('\n');
  assert.doesNotMatch(runtime, /(?:src|href)=["']https?:\/\//);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test('页面代码覆盖八类角色和三大业务模块', () => {
  const data = read('data.js');
  const app = read('app.js');
  for (const role of ['user', 'leader', 'director', 'chief', 'driver', 'mechanic', 'garage', 'system']) assert.match(data, new RegExp(`${role}:`));
  for (const page of ['homePage', 'tripListPage', 'tripPage', 'fuelPage', 'repairListPage', 'repairPage', 'vehiclesPage', 'vehiclePage', 'messagesPage', 'profilePage']) assert.match(app, new RegExp(`function ${page}\\(`));
});

test('普通、出差和特殊车辆申请执行各自审批路线', () => {
  const F = loadModel();
  F.reset();
  F.login('zhangsan', 'Demo123!');
  const ordinary = F.createTrip({ type: 'ordinary', purpose: '日常公务', destination: '海港区', start: F.at(1, '09:00'), end: F.at(1, '23:59'), preferredType: 'SUV' });
  F.login('liumei', 'Demo123!');
  F.switchRole('leader');
  F.tripAction(ordinary.id, 'deptApprove');
  F.login('chenwei', 'Demo123!');
  F.switchRole('director');
  F.tripAction(ordinary.id, 'directorApprove', { assignedType: 'SUV' });
  assert.equal(ordinary.status, 'driver_pending');

  F.login('zhangsan', 'Demo123!');
  const travel = F.createTrip({ type: 'travel', purpose: '异地出差', destination: '昌黎县', start: F.at(2, '08:00'), end: F.at(3, '23:59'), preferredType: '轿车' });
  F.login('liumei', 'Demo123!');
  F.switchRole('leader');
  F.tripAction(travel.id, 'deptApprove');
  F.login('chenwei', 'Demo123!');
  F.switchRole('director');
  F.tripAction(travel.id, 'directorApprove', { assignedType: '轿车' });
  assert.equal(travel.status, 'chief_pending');
  F.login('zhaochu', 'Demo123!');
  F.switchRole('chief');
  F.tripAction(travel.id, 'chiefApprove');
  assert.equal(travel.status, 'driver_pending');
});

test('处长处理主任节点时自动完成下一处长节点并保留记录', () => {
  const F = loadModel();
  F.reset();
  F.login('zhangsan', 'Demo123!');
  const trip = F.createTrip({ type: 'special', purpose: '特殊任务保障', destination: '北戴河区', start: F.at(1, '10:00'), end: F.at(1, '23:59'), preferredType: '商务车' });
  F.login('liumei', 'Demo123!'); F.switchRole('leader'); F.tripAction(trip.id, 'deptApprove');
  F.login('zhaochu', 'Demo123!'); F.switchRole('chief'); F.tripAction(trip.id, 'directorApprove', { assignedType: '商务车' });
  assert.equal(trip.status, 'driver_pending');
  assert.equal(trip.events.some((event) => event.auto && event.stage === 'chief'), true);
});

test('司机班可调整车型但必须说明原因，归还必须有两张照片', () => {
  const F = loadModel();
  F.reset();
  const trip = F.db.trips.find((item) => item.status === 'driver_pending');
  F.login('sunban', 'Demo123!'); F.switchRole('driver');
  assert.throws(() => F.tripAction(trip.id, 'driverAssign', { vehicle: 'v2' }), /调整原因/);
  F.tripAction(trip.id, 'driverAssign', { vehicle: 'v2', adjustReason: '原车型临时维修' });
  F.login(F.user(trip.user).account, 'Demo123!'); F.switchRole('user');
  F.tripAction(trip.id, 'start');
  assert.throws(() => F.tripAction(trip.id, 'submitReturn', { photos: ['front'] }), /前后照片/);
  F.tripAction(trip.id, 'submitReturn', { photos: ['front', 'rear'], mileage: '' });
  F.login('sunban', 'Demo123!'); F.switchRole('driver');
  F.tripAction(trip.id, 'confirmReturn', { exterior: '异常', hygiene: '良好', parts: '完整', fuelLevel: '其他', note: '右侧轻微划痕' });
  assert.equal(F.vehicle('v2').status, '异常待处理');
});

test('普通用户只能为正在使用、当天或前一天用过的车辆登记加油', () => {
  const F = loadModel();
  F.reset();
  F.login('zhangsan', 'Demo123!');
  F.switchRole('user');
  const eligible = F.eligibleFuelVehicles(F.current.id, F.day());
  assert.ok(eligible.length > 0);
  const record = F.fuelAction('add', { vehicle: eligible[0].id, amount: 360, fuelType: '92#汽油', time: `${F.day()}T14:20` });
  assert.equal(record.source, 'user');
  assert.throws(() => F.fuelAction('add', { vehicle: 'v8', amount: 100, fuelType: '柴油', time: `${F.day(-5)}T12:00` }), /不能登记/);
  F.login('chenwei', 'Demo123!'); F.switchRole('director');
  const supplemental = F.fuelAction('supplement', { vehicle: 'v8', amount: 480, fuelType: '柴油', time: `${F.day(-5)}T12:00`, reason: '历史票据补录' });
  assert.equal(supplemental.source, 'supplement');
});

test('维修报价执行 5000 元边界、处长自动审批和最终金额重审', () => {
  const F = loadModel();
  F.reset();
  F.login('xiaowu', 'Demo123!'); F.switchRole('mechanic');
  const repair = F.createRepair({ vehicle: 'v6', issue: '制动系统异响', stopNow: true });
  F.login('chenwei', 'Demo123!'); F.switchRole('director');
  F.repairAction(repair.id, 'assignGarage', { garage: 'u8' });
  F.login('haixing', 'Demo123!'); F.switchRole('garage');
  F.repairAction(repair.id, 'submitQuote', { quoteItems: [{ name: '更换制动片', unit: '套', quantity: 1, unitPrice: 5000 }], note: '更换制动片', photo: 'quote.jpg' });
  F.login('chenwei', 'Demo123!'); F.switchRole('director');
  F.repairAction(repair.id, 'directorDecision', { decision: 'approve' });
  assert.equal(repair.status, 'repairing');
  F.login('haixing', 'Demo123!'); F.switchRole('garage');
  F.repairAction(repair.id, 'complete', { actualAmount: 5200, content: '更换制动片和油液', proof: 'settlement.jpg' });
  assert.equal(repair.status, 'director_final_review');
  F.login('zhaochu', 'Demo123!'); F.switchRole('chief');
  F.repairAction(repair.id, 'directorFinal', { decision: 'approve' });
  assert.equal(repair.status, 'acceptance');
  assert.equal(repair.events.some((event) => event.auto && event.stage === 'chief'), true);
});

test('车辆台账聚合用车、加油和维修记录', () => {
  const F = loadModel();
  F.reset();
  const vehicle = F.db.vehicles[0];
  const ledger = F.vehicleLedger(vehicle.id);
  assert.ok(ledger.some((item) => item.kind === 'trip'));
  assert.ok(ledger.some((item) => item.kind === 'fuel'));
  assert.ok(ledger.some((item) => item.kind === 'repair'));
});

test('车辆导入先预检，再按车牌新增或更新且不删除原数据', () => {
  const F = loadModel();
  F.reset();
  F.login('chenwei', 'Demo123!');
  F.switchRole('director');
  const before = F.db.vehicles.length;
  const preview = F.previewVehicleImport([
    { plate: '冀C·B2088', model: '别克GL8升级版', type: '商务车', nature: '便车' },
    { plate: '冀C·Z9001', model: '红旗H9', type: '轿车', nature: '警车' },
    { plate: '', model: '错误行', type: '轿车', nature: '便车' }
  ]);
  assert.equal(preview.adds.length, 1);
  assert.equal(preview.updates.length, 1);
  assert.equal(preview.errors.length, 1);
  F.applyVehicleImport(preview);
  assert.equal(F.db.vehicles.length, before + 1);
  assert.equal(F.db.vehicles.find((item) => item.plate === '冀C·B2088').model, '别克GL8升级版');
});

test('部门汇总导出包含申请数量和完成数量', () => {
  const F = loadModel();
  F.reset();
  const rows = F.exportRows('departments');
  assert.ok(rows.length >= 4);
  assert.ok(Object.hasOwn(rows[0], '申请数量'));
  assert.ok(Object.hasOwn(rows[0], '完成数量'));
});

test('八类角色遵循最小模块权限矩阵', () => {
  const F = loadModel();
  assert.equal(F.canAccess('vehicles', 'user'), false);
  assert.equal(F.canAccess('repair', 'user'), false);
  assert.equal(F.canAccess('fuel', 'leader'), false);
  assert.equal(F.canAccess('vehicles', 'leader'), false);
  assert.equal(F.canAccess('trip', 'garage'), false);
  assert.equal(F.canAccess('fuel', 'garage'), false);
  assert.equal(F.canAccess('vehicles', 'driver'), false);
  assert.equal(F.canAccess('vehicles', 'mechanic'), false);
  assert.equal(F.canAccess('vehicles', 'director'), true);
  assert.equal(F.canAccess('imports', 'director'), true);
  assert.equal(F.canAccess('repair', 'chief'), true);
  assert.equal(F.canAccess('logs', 'system'), true);
  assert.equal(F.canAccess('vehicles', 'system'), false);
  assert.equal(F.canAccess('imports', 'system'), false);
  assert.equal(F.canAccess('exports', 'system'), false);
  assert.equal(F.canAccess('settings', 'system'), false);
});

test('超过 5000 元的主任审核界面不提供直接同意选项', () => {
  const app = read('app.js');
  assert.match(app, /const highQuote = x\.quoteAmount > 5000/);
  assert.match(app, /highQuote \? \[\['escalate','上送车辆中心处长审核'/);
});

test('页面使用集中权限进行入口过滤和路由拦截', () => {
  const source = read('app.js');
  assert.match(source, /const routeModules/);
  assert.match(source, /function guardRoute\(/);
  assert.match(source, /F\.canAccess/);
  assert.match(source, /当前身份无权访问此模块/);
  assert.match(source, /modules\.filter\(\(item\) => F\.canAccess\(item\[0\]\)\)/);
});

test('处长角色统一显示为车辆中心处长', () => {
  assert.match(read('data.js'), /chief:\s*'车辆中心处长'/);
});

test('消息只按当前身份或指定用户展示', () => {
  const F = loadModel();
  F.reset();
  F.login('zhangsan', 'Demo123!');
  F.switchRole('user');
  assert.equal(F.unreadNotifications().some((item) => item.roles?.includes('director')), false);
  F.login('wangmin', 'Demo123!');
  F.switchRole('user');
  assert.equal(F.unreadNotifications().some((item) => item.roles?.includes('director')), false);
  F.switchRole('director');
  assert.equal(F.unreadNotifications().some((item) => item.roles?.includes('director')), true);
});

test('用车流程按类型包含规范节点并标识当前节点', () => {
  const F = loadModel();
  F.reset();
  const ordinary = F.trip('YC3001');
  const travel = F.trip('YC3003');
  assert.deepEqual(F.tripFlow(ordinary).map((node) => node.id), ['apply', 'leader', 'director', 'driver', 'using', 'return_submit', 'return_confirm']);
  assert.deepEqual(F.tripFlow(travel).map((node) => node.id), ['apply', 'leader', 'director', 'chief', 'driver', 'using', 'return_submit', 'return_confirm']);
  assert.equal(F.tripFlow(ordinary).find((node) => node.id === 'driver').state, 'current');
  assert.equal(F.tripFlow(travel).every((node) => node.state === 'done'), true);
});

test('用车详情分别展示规范流程和实际操作记录', () => {
  const source = read('app.js');
  assert.match(source, /用车流程/);
  assert.match(source, /操作记录/);
  assert.match(source, /F\.tripFlow\(x\)/);
});

test('部门负责人只能查看和审批绑定部门用车单', () => {
  const F = loadModel();
  F.reset(); F.login('liumei', 'Demo123!'); F.switchRole('leader');
  assert.equal(F.canViewTrip(F.trip('YC3001')), true);
  assert.equal(F.canViewTrip(F.trip('YC3004')), false);
  assert.throws(() => F.tripAction('YC3004', 'deptApprove'), /只能审批本部门申请/);
});

test('系统管理员只能将本部门在职人员设为固定负责人', () => {
  const F = loadModel();
  F.reset(); F.login('wangmin', 'Demo123!'); F.switchRole('system');
  assert.throws(() => F.updateDepartmentLeader('d3', 'u1'), /必须属于该部门/);
  F.updateDepartmentLeader('d3', 'u13');
  assert.equal(F.department('d3').leader, 'u13');
  assert.equal(F.user('u13').roles.includes('leader'), true);
});

test('系统管理员页面包含部门管理入口和详情范围拦截', () => {
  const app = read('app.js');
  assert.match(app, /departmentsPage/);
  assert.match(app, /data-go="departments"/);
  assert.match(app, /F\.canViewTrip\(x\)/);
});

test('系统管理员可新增部门，且仅能安全删除无关联部门', () => {
  const F = loadModel();
  F.reset(); F.login('wangmin', 'Demo123!'); F.switchRole('system');
  const created = F.createDepartment('法制支队');
  assert.equal(created.name, '法制支队');
  assert.throws(() => F.createDepartment('法制支队'), /部门名称已存在/);
  assert.throws(() => F.deleteDepartment('d1'), /在职人员|历史用车单/);
  F.deleteDepartment(created.id);
  assert.equal(F.department(created.id), undefined);
});

test('维修流程按金额条件显示规范节点和当前处理节点', () => {
  const F = loadModel();
  F.reset();
  const completed = F.repairFlow(F.repair('WX3001'));
  const pending = F.repairFlow(F.repair('WX3002'));
  assert.deepEqual(completed.map((node) => node.id), ['apply', 'director_assign', 'quote', 'director_quote', 'repairing', 'acceptance']);
  assert.equal(completed.every((node) => node.state === 'done'), true);
  assert.equal(pending.find((node) => node.id === 'director_quote').state, 'current');
  assert.equal(pending.some((node) => node.id === 'chief_quote'), true);
});

test('部门页面支持新增删除，维修详情区分流程和实际记录', () => {
  const app = read('app.js');
  assert.match(app, /data-add-department/);
  assert.match(app, /data-delete-department/);
  assert.match(app, /F\.createDepartment/);
  assert.match(app, /F\.deleteDepartment/);
  assert.match(app, /维修流程/);
  assert.match(app, /操作记录/);
  assert.match(app, /F\.repairFlow\(x\)/);
});

test('申请用车默认不预设偏好车型，由主任后续分配', () => {
  const app = read('app.js');
  assert.match(app, /\['','无偏好（由主任分配）'\]/);
});

test('综合演示账号申请后切换为本部门负责人可查看用车单', () => {
  const F = loadModel();
  F.reset(); F.login('wangmin', 'Demo123!'); F.switchRole('user');
  const record = F.createTrip({ type: 'ordinary', purpose: '综合演示申请', destination: '市局', start: F.at(1, '09:00'), end: F.at(1, '23:59'), preferredType: '' });
  F.switchRole('leader');
  assert.equal(F.canViewTrip(record), true);
  assert.equal(F.db.trips.some((item) => item.id === record.id && item.department === 'd4'), true);
});

test('负责人首页统计与最近动态复用统一的用车单范围判断', () => {
  const app = read('app.js');
  assert.match(app, /F\.role === 'leader'\) items = items\.filter\(\(x\) => F\.canViewTrip\(x\)\)/);
  assert.match(app, /F\.role === 'leader'\) return \[\[roleCounts\(\), '本部门待批'\], \[F\.db\.trips\.filter\(\(x\) => F\.canViewTrip\(x\)/);
});

test('主任只能选择申请时段仍有可用车辆的车型', () => {
  const F = loadModel();
  F.reset();
  F.login('wangmin', 'Demo123!'); F.switchRole('user');
  const record = F.createTrip({ type: 'ordinary', purpose: '车型余量校验', destination: '市区', start: `${F.day(3)}T09:00`, end: `${F.day(3)}T23:59` });
  F.switchRole('leader'); F.tripAction(record.id, 'deptApprove');
  const counts = F.availableVehicleCounts(record);
  assert.ok(counts.SUV > 0);
  assert.equal(counts.货车, 0);
  F.login('chenwei', 'Demo123!'); F.switchRole('director');
  assert.throws(() => F.tripAction(record.id, 'directorApprove', { assignedType: '货车' }), /当前时段无可用车辆/);
});

test('维修报价由有效明细自动汇总，不能只提交总价', () => {
  const F = loadModel();
  F.reset(); F.login('xiaowu', 'Demo123!'); F.switchRole('mechanic');
  const repair = F.createRepair({ vehicle: 'v6', issue: '报价明细校验' });
  F.login('chenwei', 'Demo123!'); F.switchRole('director'); F.repairAction(repair.id, 'assignGarage', { garage: 'u8' });
  F.login('haixing', 'Demo123!'); F.switchRole('garage');
  assert.throws(() => F.repairAction(repair.id, 'submitQuote', { amount: 5000, quoteItems: [], photo: 'quote.jpg' }), /报价明细/);
  F.repairAction(repair.id, 'submitQuote', { quoteItems: [{ name: '更换制动片', unit: '套', quantity: 2, unitPrice: 300 }, { name: '更换制动油', unit: '项', quantity: 1, unitPrice: 200 }], photo: 'quote.jpg' });
  assert.equal(repair.quoteAmount, 800);
  assert.equal(repair.quoteItems.length, 2);
});

test('车型分配界面禁选无车车型，维修报价支持明细和主任查看', () => {
  const app = read('app.js');
  assert.match(app, /availableVehicleCounts\(x\)/);
  assert.match(app, /暂无可用车辆/);
  assert.match(app, /disabled/);
  assert.match(app, /quote-editor/);
  assert.match(app, /quoteItems: state\.quoteItems/);
  assert.match(app, /data-quote-view/);
});

test('司机班派车界面只列出主任已确定车型的可用车辆', () => {
  const app = read('app.js');
  assert.match(app, /eligibleDispatchVehicles\(x\)/);
  assert.match(app, /主任已确定为/);
});

test('用户加油记录、司机班可派车辆与系统管理员账号管理均按权限执行', () => {
  const F = loadModel();
  F.reset(); F.login('zhangsan', 'Demo123!');
  assert.ok(F.visibleFuelRecords().every((item) => item.user === F.current.id));
  const pending = F.trip('YC3001');
  assert.ok(F.eligibleDispatchVehicles(pending).every((item) => item.type === pending.assignedType));
  F.login('wangmin', 'Demo123!'); F.switchRole('system');
  F.updateUserAccess('u14', { roles: ['user', 'leader'], status: 'inactive' });
  assert.deepEqual(F.user('u14').roles, ['user', 'leader']);
  assert.equal(F.user('u14').status, 'inactive');
  F.resetUserPassword('u14');
  assert.equal(F.user('u14').password, 'Demo123!');
});

test('页面默认当天申请，并实现记录筛选、人员管理和消息历史入口', () => {
  const app = read('app.js');
  assert.match(app, /const start = `\$\{F\.day\(\)\}T09:00`/);
  assert.match(app, /visibleFuelRecords\(\)/);
  assert.match(app, /eligibleDispatchVehicles\(x\)/);
  assert.match(app, /data-repair-filter/);
  assert.match(app, /data-vehicle-filter/);
  assert.match(app, /data-message-filter/);
  assert.match(app, /data-edit-user/);
  assert.match(app, /data-reset-user/);
});

test('固定部门负责人和最后一名系统管理员不能在人员页被错误移除', () => {
  const F = loadModel();
  F.reset(); F.login('wangmin', 'Demo123!'); F.switchRole('system');
  assert.throws(() => F.updateUserAccess('u2', { roles: ['user'], status: 'active' }), /部门管理/);
  F.updateUserAccess('u14', { roles: ['user', 'system'], status: 'active' });
  F.updateUserAccess('u10', { roles: ['user', 'leader'], status: 'active' });
  F.login('lihang', 'Demo123!'); F.switchRole('system');
  assert.throws(() => F.updateUserAccess('u14', { roles: ['user'], status: 'active' }), /系统管理员/);
});

test('人员页将部门负责人交由部门管理维护，并展示筛选数量和消息时间', () => {
  const app = read('app.js');
  const data = read('data.js');
  assert.match(app, /filter\(\(\[key\]\) => key !== 'leader'\)/);
  assert.match(app, /由部门管理维护/);
  assert.match(app, /class="chip-count"/);
  assert.match(data, /id: 'N1'.*time: at\(/);
});

test('手机端控件具备足够触控面积，并正确区分已读消息', () => {
  const css = read('refinements.css');
  assert.match(css, /\.mini\{min-height:44px/);
  assert.match(css, /\.chip\{[^}]*min-height:44px/);
  assert.match(css, /\.notice-dot\.read\{[^}]*visibility:hidden/);
});

test('长表单将提交操作固定在弹窗底部，避免被内容遮挡', () => {
  const app = read('app.js');
  const css = read('refinements.css');
  assert.match(app, /class="sheet-body"/);
  assert.match(app, /class="sheet-footer"/);
  assert.match(css, /\.sheet-footer\{[^}]*position:sticky/);
});

test('用车和维修详情将标准流程与完整留痕收纳为可展开内容', () => {
  const app = read('app.js');
  assert.match(app, /<details class="flow-details"/);
  assert.match(app, /<details class="history-details"/);
  assert.match(app, /当前待办/);
});

test('维修报价录入按移动端项目卡片组织，避免单行多列拥挤', () => {
  const app = read('app.js');
  const css = read('refinements.css');
  assert.match(app, /class="quote-project"/);
  assert.match(app, /class="quote-fields"/);
  assert.match(css, /\.quote-line\{[^}]*grid-template-columns:1fr/);
  assert.match(css, /\.quote-fields\{[^}]*grid-template-columns/);
});

test('筛选数量、微信顶部外壳和演示重置入口采用低干扰移动端表达', () => {
  const app = read('app.js');
  const html = read('index.html');
  const css = read('refinements.css');
  assert.match(app, /class="chip-count"/);
  assert.match(app, /class="capsule-dots"/);
  assert.match(app, /class="demo-tools/);
  assert.match(html, /class="status-icons"/);
  assert.doesNotMatch(html, /▰▰▰/);
  assert.match(css, /\.chip-count\{/);
  assert.match(css, /\.capsule-dots\{/);
});

test('车辆档案支持关键词与车型、性质、车况的组合筛选及一键清空', () => {
  const app = read('app.js');
  const css = read('refinements.css');
  assert.match(app, /vehicleQuery:/);
  assert.match(app, /vehicleType:/);
  assert.match(app, /vehicleNature:/);
  assert.match(app, /vehicleCondition:/);
  assert.match(app, /data-form="vehicleSearch"/);
  assert.match(app, /name="keyword"/);
  assert.match(app, /select\('车型',\s*'type'/);
  assert.match(app, /select\('车辆性质',\s*'nature'/);
  assert.match(app, /select\('车况',\s*'condition'/);
  assert.match(app, /data-clear-vehicle-filters/);
  assert.match(app, /function matchesVehicleSearch\(/);
  assert.match(app, /name="type" value="\$\{esc\(state\.vehicleType\)\}"/);
  assert.match(app, /name="nature" value="\$\{esc\(state\.vehicleNature\)\}"/);
  assert.match(app, /name="condition" value="\$\{esc\(state\.vehicleCondition\)\}"/);
  assert.match(css, /\.vehicle-filter-panel\{/);
});
