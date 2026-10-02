/* Mobile-first, session-only UI for Vehicle Dispatch Demo V3.0. */
(() => {
  const F = FleetV3;
  const app = document.querySelector('#app');
  const header = document.querySelector('#header');
  const nav = document.querySelector('#nav');
  const sheet = document.querySelector('#sheet');
  const toastBox = document.querySelector('#toast');
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const fmt = (value = '') => String(value).replace('T', ' ').slice(0, 16);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const state = { route: 'login', id: '', filter: 'all', repairFilter: 'all', vehicleFilter: 'all', vehicleQuery: '', vehicleType: '', vehicleNature: '', vehicleCondition: '', messageFilter: 'unread', personSearch: '', personId: '', history: [], photos: [], activeTab: 'home', importPreview: null, departmentId: '', quoteItems: [] };
  const routeModules = Object.freeze({
    tripList: 'trip', trip: 'trip', tripApply: 'trip', fuel: 'fuel',
    repairList: 'repair', repair: 'repair', repairApply: 'repair',
    vehicles: 'vehicles', vehicle: 'vehicles', people: 'people', departments: 'departments', imports: 'imports',
    exports: 'exports', logs: 'logs', settings: 'settings'
  });

  const icons = `<svg width="0" height="0" style="position:absolute"><defs>
    <symbol id="i-back" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
    <symbol id="i-home" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9H3z"/><path d="M9 20v-6h6v6"/></symbol>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></symbol>
    <symbol id="i-car" viewBox="0 0 24 24"><path d="m5 16-2-2 2-7h14l2 7-2 2z"/><path d="M6 16v3m12-3v3M7 12h.01M17 12h.01"/></symbol>
    <symbol id="i-fuel" viewBox="0 0 24 24"><path d="M4 21V3h11v18M4 8h11M2 21h15"/><path d="m17 7 3 3v7a2 2 0 0 0 2 2V8l-3-3"/></symbol>
    <symbol id="i-tool" viewBox="0 0 24 24"><path d="M14 6a4 4 0 0 0-5-3l3 3-3 3-3-3a4 4 0 0 0 5 5l8 8 2-2-8-8"/></symbol>
    <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
    <symbol id="i-camera" viewBox="0 0 24 24"><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 17V5m-5 5 5-5 5 5M4 21h16"/></symbol>
    <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 2h9l4 4v16H6zM14 2v5h5"/></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
  </defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', icons);

  const labels = {
    ordinary: '普通用车', travel: '出差用车', special: '特殊车辆',
    dept_pending: '部门待审批', director_pending: '主任待处理', chief_pending: '车辆中心处长待审批', driver_pending: '待司机班派车', assigned: '待领车', using: '使用中', return_pending: '待归还确认', done: '已完成', rejected: '已驳回', cancelled: '已取消',
    pending_assignment: '待分派修理厂', quote_pending: '待报价', director_review: '主任审核报价', chief_review: '车辆中心处长审核报价', repairing: '维修中', director_final_review: '主任复核金额', chief_final_review: '车辆中心处长复核金额', acceptance: '待修理工验收'
  };
  const statusLabel = (value) => labels[value] || value || '—';
  const badge = (value) => {
    const cls = /完成|空闲|良好|done/.test(value) ? 'green' : /驳回|异常|停用|rejected/.test(value) ? 'red' : /待|pending|review/.test(value) ? 'orange' : '';
    return `<span class="badge ${cls}">${esc(statusLabel(value))}</span>`;
  };
  const toast = (message) => { toastBox.textContent = message; toastBox.classList.add('show'); setTimeout(() => toastBox.classList.remove('show'), 1800); };
  const dept = (id) => F.department(id)?.name || '外部单位';
  const username = (id) => F.user(id)?.name || '—';
  const plate = (id) => F.vehicle(id)?.plate || '待派车';
  const option = (value, text, selected = false) => `<option value="${esc(value)}" ${selected ? 'selected' : ''}>${esc(text)}</option>`;
  const field = (label, name, type = 'text', value = '', attrs = '') => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const select = (label, name, options, current = '') => `<label class="field"><span>${label}</span><select name="${name}">${options.map(([v, t]) => option(v, t, v === current)).join('')}</select></label>`;
  const textarea = (label, name, value = '', placeholder = '') => `<label class="field"><span>${label}</span><textarea name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
  const detailRow = (label, value) => `<div class="detail-row"><span>${esc(label)}</span><span>${value}</span></div>`;
  const empty = (title, text = '') => `<div class="empty">${icon('file')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;

  function guardRoute(route) {
    const moduleName = routeModules[route];
    if (!moduleName || F.canAccess(moduleName)) return true;
    toast('当前身份无权访问此模块');
    state.route = 'business';
    state.id = '';
    return false;
  }

  function go(route, id = '', replace = false) {
    if (!replace && state.route !== route) state.history.push({ route: state.route, id: state.id });
    state.route = route; state.id = id; state.filter = 'all'; render();
  }
  function back() {
    const previous = state.history.pop();
    if (previous) { state.route = previous.route; state.id = previous.id; } else { state.route = 'home'; state.id = ''; }
    render();
  }
  function pageHeader(title, canBack = true) {
    header.innerHTML = `<div class="head-title">${canBack ? `<button class="back" data-back aria-label="返回">${icon('back')}</button>` : ''}<span>${esc(title)}</span></div><div class="capsule" aria-label="微信小程序菜单"><span class="capsule-dots"><b></b><b></b><b></b></span><i class="capsule-divider"></i><span class="capsule-circle"></span></div>`;
  }
  function bottomNav(active = 'home') {
    if (!F.current || state.route === 'login') { nav.innerHTML = ''; return; }
    nav.innerHTML = [
      ['home', '首页', 'home'], ['business', '业务中心', 'grid'], ['profile', '我的', 'user']
    ].map(([route, title, ico]) => `<button data-go="${route}" class="${active === route ? 'active' : ''}">${icon(ico)}<span>${title}</span></button>`).join('');
  }
  function render() {
    app.scrollTop = 0;
    if (!F.current && state.route !== 'login') state.route = 'login';
    guardRoute(state.route);
    const pages = { login: loginPage, home: homePage, business: businessPage, tripList: tripListPage, trip: tripPage, tripApply: tripApplyPage, fuel: fuelPage, repairList: repairListPage, repair: repairPage, repairApply: repairApplyPage, vehicles: vehiclesPage, vehicle: vehiclePage, messages: messagesPage, profile: profilePage, people: peoplePage, departments: departmentsPage, imports: importPage, exports: exportsPage, logs: logsPage, settings: settingsPage };
    (pages[state.route] || homePage)();
  }

  function loginPage() {
    pageHeader('登录', false); bottomNav();
    app.innerHTML = `<div class="login-wrap"><div class="login-mark">行</div><div class="login-copy"><div class="eyebrow">XINGXU · FLEET V3</div><h1>每一程，安排有序</h1><p>车辆使用、加油与维修一体化管理</p></div>
      <form class="login-form" data-form="login">
        ${select('演示账号', 'account', F.db.users.map((u) => [u.account, `${u.name} · ${u.roles.map((r) => F.roles[r]).join('/')}`]), 'wangmin')}
        ${field('密码', 'password', 'password', 'Demo123!', 'required')}
        <button class="btn wide" type="submit">账号密码登录</button>
        <div class="divider">或使用微信身份</div>
        <button class="btn wide wechat" type="button" data-wechat>微信授权登录（模拟）</button>
      </form><p class="demo-note">纯离线演示 · 关闭或刷新页面即恢复初始数据<br>所有演示账号初始密码：Demo123!</p></div>`;
  }

  const roleCounts = () => {
    const role = F.role;
    if (role === 'leader') return F.db.trips.filter((x) => x.status === 'dept_pending' && F.department(x.department)?.leader === F.current.id).length;
    if (role === 'director') return F.db.trips.filter((x) => x.status === 'director_pending').length + F.db.repairs.filter((x) => ['pending_assignment', 'director_review', 'director_final_review'].includes(x.status)).length;
    if (role === 'chief') return F.db.trips.filter((x) => ['director_pending', 'chief_pending'].includes(x.status)).length + F.db.repairs.filter((x) => ['pending_assignment', 'director_review', 'chief_review', 'director_final_review', 'chief_final_review'].includes(x.status)).length;
    if (role === 'driver') return F.db.trips.filter((x) => ['driver_pending', 'return_pending'].includes(x.status)).length;
    if (role === 'mechanic') return F.db.repairs.filter((x) => x.status === 'acceptance').length;
    if (role === 'garage') return F.db.repairs.filter((x) => x.garage === F.current.id && ['quote_pending', 'repairing'].includes(x.status)).length;
    if (role === 'system') return F.db.users.filter((x) => x.status !== 'active').length;
    return F.db.trips.filter((x) => x.user === F.current.id && !['done', 'rejected', 'cancelled'].includes(x.status)).length;
  };
  function homeStats() {
    const unread = F.unreadNotifications().length;
    if (['director', 'chief'].includes(F.role)) return [[roleCounts(), '我的待办'], [F.db.vehicles.filter((v) => v.status === '空闲').length, '空闲车辆'], [F.db.vehicles.filter((v) => v.status === '使用中').length, '使用中']];
    if (F.role === 'user') return [[F.db.trips.filter((x) => x.user === F.current.id && !['done','rejected','cancelled'].includes(x.status)).length, '进行中'], [F.db.trips.filter((x) => x.user === F.current.id && x.status === 'return_pending').length, '待归还'], [unread, '未读消息']];
    if (F.role === 'leader') return [[roleCounts(), '本部门待批'], [F.db.trips.filter((x) => F.canViewTrip(x) && !['done','rejected','cancelled'].includes(x.status)).length, '处理中'], [unread, '未读消息']];
    if (F.role === 'driver') return [[F.db.trips.filter((x) => x.status === 'driver_pending').length, '待派车'], [F.db.trips.filter((x) => x.status === 'return_pending').length, '待确认归还'], [unread, '未读消息']];
    if (F.role === 'mechanic') return [[F.db.repairs.filter((x) => x.status === 'acceptance').length, '待验收'], [F.db.repairs.filter((x) => !['done','rejected'].includes(x.status)).length, '维修处理中'], [unread, '未读消息']];
    if (F.role === 'garage') return [[F.db.repairs.filter((x) => x.garage === F.current.id && x.status === 'quote_pending').length, '待报价'], [F.db.repairs.filter((x) => x.garage === F.current.id && x.status === 'repairing').length, '维修中'], [unread, '未读消息']];
    return [[F.db.users.length, '账号总数'], [F.db.users.filter((x) => x.status === 'active').length, '已启用'], [F.db.logs.length, '操作日志']];
  }
  function homePage() {
    pageHeader('车辆调度', false); bottomNav('home');
    const unread = F.unreadNotifications().length;
    const pending = roleCounts();
    const stats = homeStats();
    app.innerHTML = `<div class="row"><div><div class="greeting">${esc(F.current.name)}，您好</div><small>${esc(dept(F.current.department))}</small></div><button class="role-btn" data-role-sheet>${esc(F.roles[F.role])}⌄</button></div>
      <section class="hero"><div class="eyebrow light">今日车辆调度</div><h2>${pending ? `${pending} 项工作待处理` : '当前工作已处理完毕'}</h2><p>${F.role === 'user' ? '申请、领车、归还都可在手机上完成' : '按流程处理待办，所有操作自动留痕'}</p><button class="btn white" data-go="business">进入业务中心</button></section>
      <div class="stat-grid">${stats.map(([value, title]) => `<div class="stat"><b>${value}</b><span>${title}</span></div>`).join('')}</div>
      <div class="section-title"><h2>快捷入口</h2><button class="link" data-go="messages">消息 ${unread ? `<em class="dot">${unread}</em>` : ''}</button></div>
      <div class="quick-grid">${homeQuickActions().map(([route, ico, title, sub]) => `<button class="quick" data-go="${route}">${icon(ico)}<b>${title}</b><small>${sub}</small></button>`).join('')}</div>
      <div class="section-title"><h2>最近动态</h2></div>${recentCards()}`;
  }
  function homeQuickActions() {
    const role = F.role;
    if (role === 'user') return [['tripApply', 'plus', '申请用车', '普通、出差、特殊'], ['fuel', 'fuel', '加油登记', '当天及前一天车辆'], ['tripList', 'file', '我的用车', '查看审批与派车'], ['messages', 'bell', '消息提醒', '查看本人消息']];
    if (role === 'leader') return [['tripList', 'car', '用车审批', '仅审批本部门申请'], ['messages', 'bell', '审批消息', '查看待办提醒']];
    if (['director', 'chief'].includes(role)) return [['tripList', 'car', '用车调度', '审批、车型和派车'], ['fuel', 'fuel', '加油管理', '补登与对账导出'], ['repairList', 'tool', '维修管理', '报价、审核与验收'], ['vehicles', 'grid', '车辆档案', '全周期台账']];
    if (role === 'driver') return [['tripList', 'car', '派车与归还', '确定车牌、确认收车'], ['messages', 'bell', '任务消息', '查看待办提醒']];
    if (role === 'mechanic') return [['repairApply', 'plus', '报修车辆', '提交维修需求'], ['repairList', 'tool', '维修任务', '查看与验收'], ['messages', 'bell', '消息提醒', '待办消息']];
    if (role === 'garage') return [['repairList', 'tool', '维修任务', '报价与完工'], ['messages', 'bell', '任务消息', '新任务提醒'], ['profile', 'user', '企业资料', '账号信息'], ['business', 'grid', '业务中心', '全部可用功能']];
    return [['people', 'user', '人员权限', '账号与角色'], ['departments', 'grid', '部门管理', '固定负责人维护'], ['logs', 'file', '操作日志', '安全审计']];
  }
  function recentCards() {
    if (F.canAccess('trip')) {
      let items = F.db.trips;
      if (F.role === 'user') items = items.filter((x) => x.user === F.current.id);
      if (F.role === 'leader') items = items.filter((x) => F.canViewTrip(x));
      if (F.role === 'driver') items = items.filter((x) => ['driver_pending','assigned','using','return_pending','done'].includes(x.status));
      return `<div class="stack">${items.slice(0, 2).map((x) => `<button class="card clickable" data-open-trip="${x.id}"><div class="row"><b>${esc(x.purpose)}</b>${badge(x.status)}</div><div class="date-line">${icon('car')}<span>${esc(plate(x.vehicle))} · ${esc(x.destination)}</span></div><div class="card-footer"><span>${esc(x.id)}</span><span>${fmt(x.start)}</span></div></button>`).join('') || empty('暂无相关动态')}</div>`;
    }
    if (F.canAccess('repair')) {
      let items = F.db.repairs;
      if (F.role === 'garage') items = items.filter((x) => x.garage === F.current.id);
      return `<div class="stack">${items.slice(0, 2).map(repairCard).join('') || empty('暂无维修动态')}</div>`;
    }
    return `<div class="stack">${F.db.logs.slice(0, 2).map((x) => `<div class="card"><b>${esc(x.action)}</b><small>${fmt(x.time)} · ${esc(x.object)}</small></div>`).join('') || empty('暂无系统操作')}</div>`;
  }

  function businessPage() {
    pageHeader('业务中心', false); bottomNav('business');
    const modules = [
      ['trip', 'tripList', 'car', '用车调度', '申请、审批、定车型、派车与归还', '#eaf1ff'],
      ['fuel', 'fuel', 'fuel', '加油管理', '用车人员登记，车管中心导出对账', '#e9f8f1'],
      ['repair', 'repairList', 'tool', '维修管理', '报修、报价、分级审核、完工验收', '#fff3e5'],
      ['vehicles', 'vehicles', 'grid', '车辆档案', '车辆状态与全周期台账', '#f1edff']
    ];
    const visibleModules = modules.filter((item) => F.canAccess(item[0]));
    app.innerHTML = `<div class="page-lead"><h1>业务中心</h1><p>仅显示当前身份获授权的业务</p></div><div class="module-stack">${visibleModules.map(([, route, ico, title, text, color]) => `<button class="module-card" data-go="${route}"><span class="module-icon" style="background:${color}">${icon(ico)}</span><span class="grow"><b>${title}</b><small>${text}</small></span>${icon('chevron')}</button>`).join('') || empty('当前身份暂无业务模块')}</div>
      ${F.role === 'system' ? `<div class="section-title"><h2>系统管理</h2></div><div class="card menu-card">${[['people','人员与权限'],['departments','部门管理'],['logs','操作日志']].map(([r,t]) => `<button class="list-item" data-go="${r}"><span class="grow">${t}</span>${icon('chevron')}</button>`).join('')}</div>` : ''}`;
  }

  function tripListPage() {
    pageHeader('用车单'); bottomNav('business');
    let rows = F.db.trips;
    if (F.role === 'user') rows = rows.filter((x) => x.user === F.current.id);
    if (F.role === 'leader') rows = rows.filter((x) => F.department(x.department)?.leader === F.current.id);
    if (F.role === 'driver') rows = rows.filter((x) => ['driver_pending','assigned','using','return_pending','done'].includes(x.status));
    const filters = [['all','全部'],['pending','待我处理'],['assigned','待用车'],['using','使用中'],['return_pending','待归还']];
    if (state.filter === 'pending') rows = rows.filter(isTripPendingForMe);
    else if (state.filter !== 'all') rows = rows.filter((x) => x.status === state.filter);
    app.innerHTML = `<div class="row"><div><h1>用车单</h1><small>申请、审批、派车和归还</small></div>${F.role === 'user' ? `<button class="btn mini" data-go="tripApply">${icon('plus')}申请</button>` : ''}</div>
      <div class="chip-row">${filters.map(([v,t]) => `<button class="chip ${state.filter === v ? 'active' : ''}" data-filter="${v}">${t}</button>`).join('')}</div>
      <div class="stack">${rows.length ? rows.map(tripCard).join('') : empty('暂无用车单','切换筛选条件查看其他记录')}</div>`;
  }
  function isTripPendingForMe(x) {
    return (F.role === 'leader' && x.status === 'dept_pending' && F.department(x.department)?.leader === F.current.id) ||
      (F.role === 'director' && x.status === 'director_pending') ||
      (F.role === 'chief' && ['director_pending','chief_pending'].includes(x.status)) ||
      (F.role === 'driver' && ['driver_pending','return_pending'].includes(x.status));
  }
  function tripCard(x) {
    return `<button class="card clickable order-card" data-open-trip="${x.id}"><div class="row"><div><span class="badge gray">${statusLabel(x.type)}</span><div class="order-title">${esc(x.purpose)}</div></div>${badge(x.status)}</div><div class="date-line">${icon('car')}<span>${esc(plate(x.vehicle))} · ${esc(x.destination)}</span></div><div class="card-footer"><span>${esc(username(x.user))} · ${esc(dept(x.department))}</span><span>${fmt(x.start)}</span></div></button>`;
  }

  function tripApplyPage() {
    pageHeader('申请用车'); bottomNav('business');
    const start = `${F.day()}T09:00`, end = `${F.day()}T23:59`;
    app.innerHTML = `<form data-form="tripApply"><div class="hint mb">默认普通用车、当天 23:59 前归还；如需跨天可直接修改预计结束时间。</div>
      ${select('用车类型 <i class="required">*</i>', 'type', [['ordinary','普通用车'],['travel','出差用车'],['special','特殊车辆']], 'ordinary')}
      ${field('申请人', 'applicant', 'text', `${F.current.name}（直接负责人）`, 'disabled')}
      ${field('用车部门', 'department', 'text', dept(F.current.department), 'disabled')}
      ${textarea('用车事由 <i class="required">*</i>', 'purpose', '', '如：现场走访、案件材料移交')}
      ${field('目的地 / 行程 <i class="required">*</i>', 'destination', 'text', '', 'placeholder="填写目的地" required')}
      ${select('偏好车型', 'preferredType', [['','无偏好（由主任分配）'], ...['轿车','SUV','商务车','客车','货车','其他'].map((v) => [v,v])], '')}
      <div class="two">${field('开始时间', 'start', 'datetime-local', start, 'required')}${field('预计结束', 'end', 'datetime-local', end, 'required')}</div>
      ${field('随行人数', 'passengers', 'number', '1', 'min="1"')}${textarea('补充说明', 'note', '', '可填写随行人员、装载物品等')}
      <button class="btn wide" type="submit">提交用车申请</button></form>`;
  }

  function tripPage() {
    const x = F.trip(state.id); if (!x || !F.canViewTrip(x)) { toast('当前身份无权查看该部门用车单'); return go('tripList', '', true); }
    pageHeader('用车单详情'); bottomNav('business');
    const car = F.vehicle(x.vehicle);
    const flow = F.tripFlow(x);
    const current = flow.find((node) => node.state === 'current');
    app.innerHTML = `<section class="detail-state"><div class="row"><span class="badge gray">${statusLabel(x.type)}</span>${badge(x.status)}</div><h1>${esc(x.purpose)}</h1><p class="muted">${esc(x.id)} · ${esc(dept(x.department))}</p></section>
      <section class="card">${detailRow('申请人 / 负责人', esc(username(x.user)))}${detailRow('目的地', esc(x.destination))}${detailRow('使用时间', `${fmt(x.start)}<br>${fmt(x.end)}`)}${detailRow('偏好车型', esc(x.preferredType || '不限'))}${detailRow('确定车型', esc(x.assignedType || '待确定'))}${detailRow('车辆', car ? `${esc(car.plate)} · ${esc(car.model)}` : '待司机班派车')}${x.adjustReason ? detailRow('车型调整原因', esc(x.adjustReason)) : ''}</section>
      <section class="current-task card"><small>当前待办</small><b>${esc(current?.title || '流程已完成')}</b><p>${current ? '请按当前节点办理；完整流程和留痕可展开查看。' : '该用车单已完成全部流程。'}</p></section>
      ${workflowDetails('用车流程', '标准节点', flow)}
      ${historyDetails(x.events || [])}
      ${tripActions(x)}`;
  }
  function tripActions(x) {
    const actions = [];
    if (F.role === 'leader' && x.status === 'dept_pending' && F.department(x.department)?.leader === F.current.id) actions.push(['approveTrip','同意并上送','btn'],['rejectTrip','驳回','btn danger']);
    if (['director','chief'].includes(F.role) && x.status === 'director_pending') actions.push(['setType','确定车型并通过','btn'],['rejectTrip','驳回','btn danger']);
    if (F.role === 'chief' && x.status === 'chief_pending') actions.push(['chiefApprove','同意并送司机班','btn'],['rejectTrip','驳回','btn danger']);
    if (F.role === 'driver' && x.status === 'driver_pending') actions.push(['assignVehicle','选择车辆并派车','btn']);
    if (F.role === 'user' && x.user === F.current.id && x.status === 'assigned') actions.push(['startTrip','确认领车并开始','btn']);
    if (F.role === 'user' && x.user === F.current.id && x.status === 'using') actions.push(['returnTrip','停车并提交归还','btn']);
    if (F.role === 'driver' && x.status === 'return_pending') actions.push(['confirmReturn','检查并确认归还','btn']);
    if (F.role === 'user' && x.user === F.current.id && x.status === 'dept_pending') actions.push(['cancelTrip','取消申请','btn ghost']);
    return actions.length ? `<div class="sticky-actions">${actions.map(([a,t,c]) => `<button class="${c}" data-trip-action="${a}">${t}</button>`).join('')}</div>` : '';
  }

  function fuelPage() {
    pageHeader('加油管理'); bottomNav('business');
    const eligible = F.role === 'user' ? F.eligibleFuelVehicles(F.current.id, F.day()) : [];
    const canSupplement = ['director','chief','system'].includes(F.role);
    const records = F.visibleFuelRecords();
    app.innerHTML = `<div class="row"><div><h1>加油记录</h1><small>供车管中心线下对账</small></div>${(eligible.length || canSupplement) ? `<button class="btn mini" data-fuel-add="${canSupplement && !eligible.length ? 'supplement' : 'add'}">${icon('plus')}登记</button>` : ''}</div>
      <div class="hint mt">普通用户仅可登记本人当天或前一天使用过的车辆；其他记录由车管中心补登。</div>
      <div class="section-title"><h2>最近记录</h2>${canSupplement ? '<button class="link" data-export="fuels">导出 CSV</button>' : ''}</div>
      <div class="stack">${records.map((x) => `<div class="card"><div class="row"><div><b>${esc(plate(x.vehicle))}</b><small>${esc(username(x.user))} · ${esc(dept(x.department))}</small></div><strong>¥${x.amount}</strong></div><div class="card-footer"><span>${esc(x.fuelType)} · ${x.source === 'supplement' ? '车管补登' : '用户登记'}</span><span>${fmt(x.time)}</span></div></div>`).join('') || empty('暂无加油记录')}</div>`;
  }

  function repairListPage() {
    pageHeader('维修管理'); bottomNav('business');
    let rows = F.db.repairs;
    if (F.role === 'garage') rows = rows.filter((x) => x.garage === F.current.id);
    const filters = [['all','全部'],['pending','待处理'],['repairing','维修中'],['done','已完成']];
    const matchesRepairFilter = (item, filter) => filter === 'all' || (filter === 'pending' ? ['pending_assignment','quote_pending','director_review','chief_review','director_final_review','chief_final_review','acceptance'].includes(item.status) : item.status === filter);
    const scopedRows = rows;
    rows = rows.filter((item) => matchesRepairFilter(item, state.repairFilter));
    const canApply = F.role === 'mechanic';
    app.innerHTML = `<div class="row"><div><h1>车辆维修</h1><small>单厂报价 · 分级审批 · 验收闭环</small></div>${canApply ? `<button class="btn mini" data-go="repairApply">${icon('plus')}报修</button>` : ''}</div>
      <div class="chip-row">${filters.map(([value, title]) => { const count = scopedRows.filter((item) => matchesRepairFilter(item, value)).length; return `<button class="chip ${state.repairFilter === value ? 'active' : ''}" data-repair-filter="${value}"><span>${title}</span><i class="chip-count">${count}</i></button>`; }).join('')}</div>
      <div class="stack">${rows.map(repairCard).join('') || empty('暂无维修任务')}</div>`;
  }
  function repairCard(x) {
    const car = F.vehicle(x.vehicle);
    return `<button class="card clickable" data-open-repair="${x.id}"><div class="row"><div><b>${esc(car?.plate)}</b><small>${esc(car?.model)}</small></div>${badge(x.status)}</div><p class="repair-issue">${esc(x.issue)}</p><div class="card-footer"><span>${x.quoteAmount ? `报价 ¥${x.quoteAmount}` : '等待报价'}</span><span>${fmt(x.createdAt)}</span></div></button>`;
  }
  function repairApplyPage() {
    pageHeader('提交维修申请'); bottomNav('business');
    app.innerHTML = `<form data-form="repairApply">${select('维修车辆 <i class="required">*</i>', 'vehicle', F.db.vehicles.map((v) => [v.id, `${v.plate} · ${v.model}`]))}${textarea('故障 / 维修需求 <i class="required">*</i>', 'issue', '', '描述故障现象、发现时间和维修建议')}<label class="check"><input type="checkbox" name="stopNow"><span><b>车辆立即停用</b><small>勾选后车辆不能继续派出</small></span></label><div class="hint warn mt">未勾选表示暂时可用；主任分派修理厂后进入维修状态。</div><button class="btn wide mt" type="submit">提交维修申请</button></form>`;
  }
  function repairPage() {
    const x = F.repair(state.id); if (!x) return go('repairList', '', true);
    pageHeader('维修单详情'); bottomNav('business'); const car = F.vehicle(x.vehicle);
    const flow = F.repairFlow(x);
    const current = flow.find((node) => node.state === 'current');
    app.innerHTML = `<section class="detail-state"><div class="row"><span class="badge gray">${esc(x.id)}</span>${badge(x.status)}</div><h1>${esc(car?.plate)}</h1><p class="muted">${esc(car?.model)} · ${esc(car?.type)} · ${esc(car?.nature)}</p></section>
      <section class="card">${detailRow('维修需求', esc(x.issue))}${detailRow('申请人', esc(username(x.applicant)))}${detailRow('是否停用', x.stopNow ? '立即停用' : '暂时可用')}${detailRow('修理厂', esc(F.user(x.garage)?.garageName || '待分派'))}${detailRow('报价金额', x.quoteAmount ? `¥${x.quoteAmount}` : '待报价')}${x.quoteItems?.length && ['director','chief'].includes(F.role) ? `<button class="list-item" data-quote-view="${x.id}"><span class="grow"><b>查看维修工程报价单</b><small>${x.quoteItems.length} 个项目 · 点击查看项目与价格</small></span>${icon('chevron')}</button>` : ''}${detailRow('最终金额', x.actualAmount ? `¥${x.actualAmount}` : '—')}${detailRow('验收结果', esc(x.result || '—'))}</section>
      <section class="current-task card"><small>当前待办</small><b>${esc(current?.title || '流程已完成')}</b><p>${current ? '请按当前节点办理；完整流程和留痕可展开查看。' : '该维修单已完成全部流程。'}</p></section>
      ${workflowDetails('维修流程', '标准节点', flow)}
      ${historyDetails(x.events || [])}${repairActions(x)}`;
  }
  function repairActions(x) {
    const actions = [];
    if (['director','chief'].includes(F.role) && x.status === 'pending_assignment') actions.push(['assignGarage','分派修理厂','btn']);
    if (F.role === 'garage' && x.status === 'quote_pending' && x.garage === F.current.id) actions.push(['submitQuote','提交报价','btn']);
    if (['director','chief'].includes(F.role) && x.status === 'director_review') actions.push(['directorDecision','审核报价','btn']);
    if (F.role === 'chief' && x.status === 'chief_review') actions.push(['chiefDecision','车辆中心处长审批','btn']);
    if (F.role === 'garage' && x.status === 'repairing' && x.garage === F.current.id) actions.push(['completeRepair','登记维修完成','btn']);
    if (['director','chief'].includes(F.role) && x.status === 'director_final_review') actions.push(['directorFinal','复核最终金额','btn']);
    if (F.role === 'chief' && x.status === 'chief_final_review') actions.push(['chiefFinal','车辆中心处长复核金额','btn']);
    if (F.role === 'mechanic' && x.status === 'acceptance') actions.push(['acceptRepair','验车收车','btn']);
    return actions.length ? `<div class="sticky-actions">${actions.map(([a,t,c]) => `<button class="${c}" data-repair-action="${a}">${t}</button>`).join('')}</div>` : '';
  }

  function vehiclesPage() {
    pageHeader('车辆档案'); bottomNav('business');
    const filters = [['all','全部'],['空闲','空闲'],['使用中','使用中'],['维修中','维修中'],['abnormal','异常']];
    const matchesVehicleFilter = (item, filter) => filter === 'all' || (filter === 'abnormal' ? ['异常','待检修'].includes(item.condition) || ['停用','异常待处理'].includes(item.status) : item.status === filter);
    const types = [...new Set(F.db.vehicles.map((item) => item.type))];
    const natures = [...new Set(F.db.vehicles.map((item) => item.nature))];
    const conditions = [...new Set(F.db.vehicles.map((item) => item.condition))];
    const rows = F.db.vehicles.filter((item) => matchesVehicleFilter(item, state.vehicleFilter) && matchesVehicleSearch(item));
    const activeAdvanced = [state.vehicleType, state.vehicleNature, state.vehicleCondition].filter(Boolean).length;
    app.innerHTML = `<div class="row"><div><h1>车辆档案</h1><small>共 ${F.db.vehicles.length} 辆 · 找到 ${rows.length} 辆</small></div>${F.canAccess('imports') ? '<button class="btn mini" data-go="imports">批量导入</button>' : ''}</div><form class="vehicle-search" data-form="vehicleSearch">${icon('search')}<input name="keyword" value="${esc(state.vehicleQuery)}" placeholder="搜索车牌号、车型"><input type="hidden" name="type" value="${esc(state.vehicleType)}"><input type="hidden" name="nature" value="${esc(state.vehicleNature)}"><input type="hidden" name="condition" value="${esc(state.vehicleCondition)}"><button class="link" type="submit">搜索</button></form><div class="chip-row">${filters.map(([value, title]) => { const count = F.db.vehicles.filter((item) => matchesVehicleFilter(item, value)).length; return `<button class="chip ${state.vehicleFilter === value ? 'active' : ''}" data-vehicle-filter="${value}"><span>${title}</span><i class="chip-count">${count}</i></button>`; }).join('')}</div><details class="vehicle-filter-panel" ${activeAdvanced ? 'open' : ''}><summary><span><b>组合筛选</b><small>${activeAdvanced ? `已选 ${activeAdvanced} 项` : '车型、车辆性质、车况'}</small></span><span class="flow-toggle">展开</span></summary><form data-form="vehicleSearch" class="vehicle-filter-form"><div class="two">${select('车型','type',[['','全部车型'],...types.map((item) => [item,item])],state.vehicleType)}${select('车辆性质','nature',[['','全部性质'],...natures.map((item) => [item,item])],state.vehicleNature)}</div>${select('车况','condition',[['','全部车况'],...conditions.map((item) => [item,item])],state.vehicleCondition)}<input type="hidden" name="keyword" value="${esc(state.vehicleQuery)}"><div class="actions"><button class="btn secondary" type="submit">应用筛选</button><button class="btn ghost" type="button" data-clear-vehicle-filters>清空条件</button></div></form></details><div class="stack vehicle-results">${rows.map((v) => `<button class="card clickable" data-open-vehicle="${v.id}"><div class="row"><div class="left"><div class="car-thumb">${icon('car')}</div><div><b>${esc(v.plate)}</b><small>${esc(v.model)} · ${esc(v.type)}</small></div></div>${badge(v.status)}</div><div class="card-footer"><span>${esc(v.nature)} · ${v.seats}座</span><span>车况 ${esc(v.condition)}</span></div></button>`).join('') || empty('暂无符合条件的车辆','请调整搜索关键词或筛选条件')}</div>`;
  }
  function matchesVehicleSearch(item) {
    const keyword = state.vehicleQuery.trim().toLowerCase();
    return (!keyword || [item.plate, item.model, item.type, item.nature].some((value) => String(value || '').toLowerCase().includes(keyword))) &&
      (!state.vehicleType || item.type === state.vehicleType) && (!state.vehicleNature || item.nature === state.vehicleNature) && (!state.vehicleCondition || item.condition === state.vehicleCondition);
  }
  function vehiclePage() {
    const v = F.vehicle(state.id); if (!v) return go('vehicles', '', true); pageHeader('车辆详情'); bottomNav('business');
    const ledger = F.vehicleLedger(v.id);
    app.innerHTML = `<div class="vehicle-hero"><div class="car-thumb large">${icon('car')}</div><div><h1>${esc(v.plate)}</h1><p>${esc(v.model)} · ${esc(v.type)}</p></div>${badge(v.status)}</div><section class="card">${detailRow('车辆性质', esc(v.nature))}${detailRow('座位数', `${v.seats} 座`)}${detailRow('所属单位', esc(v.unit))}${detailRow('车辆健康', esc(v.condition))}${detailRow('年检有效期', esc(v.inspection))}${detailRow('保险有效期', esc(v.insurance))}</section><div class="section-title"><h2>车辆全周期记录</h2><button class="link" data-export-ledger="${v.id}">导出</button></div><section class="card ledger">${ledger.map((x) => `<div class="ledger-item"><span class="ledger-kind ${x.kind}">${x.kind === 'trip' ? '用' : x.kind === 'fuel' ? '油' : '修'}</span><div class="grow"><b>${esc(x.title)}</b><small>${fmt(x.time)} · ${esc(statusLabel(x.status))}</small></div></div>`).join('') || empty('暂无记录')}</section>`;
  }

  function messagesPage() {
    pageHeader('消息提醒'); bottomNav('profile'); const visibleItems = F.notifications();
    const matchesMessageFilter = (item, filter) => filter === 'all' || (filter === 'read' ? item.readBy.includes(F.current.id) : !item.readBy.includes(F.current.id));
    const items = visibleItems.filter((item) => matchesMessageFilter(item, state.messageFilter));
    app.innerHTML = `<div class="page-lead"><h1>消息中心</h1><p>业务待办、超时与状态变化提醒</p></div><div class="chip-row">${[['unread','未读'],['read','已读'],['all','全部']].map(([value, title]) => { const count = visibleItems.filter((item) => matchesMessageFilter(item, value)).length; return `<button class="chip ${state.messageFilter === value ? 'active' : ''}" data-message-filter="${value}"><span>${title}</span><i class="chip-count">${count}</i></button>`; }).join('')}</div><div class="stack">${items.map((x) => `<button class="card clickable notice" data-notice="${x.id}" data-target="${esc(x.target)}">${x.readBy.includes(F.current.id) ? '<span class="notice-dot read"></span>' : '<span class="notice-dot"></span>'}<div class="grow"><b>${esc(x.title)}</b><p>${esc(x.text)}</p><small>${fmt(x.time || '')}</small></div>${icon('chevron')}</button>`).join('') || empty('暂无消息','新任务和每日超时提醒会显示在这里')}</div>`;
  }
  function profilePage() {
    pageHeader('我的', false); bottomNav('profile');
    const links = [
      ['messages', '消息中心', F.unreadNotifications().length || ''],
      ...(F.canAccess('vehicles') ? [['vehicles', '车辆档案与台账', '']] : []),
      ...(F.canAccess('people') ? [['people', '人员与权限', '']] : []),
      ...(F.canAccess('departments') ? [['departments', '部门管理', '']] : []),
      ...(F.canAccess('settings') ? [['settings', '系统设置', '']] : [])
    ];
    app.innerHTML = `<section class="profile"><div class="avatar">${esc(F.current.name.slice(0,1))}</div><div class="grow"><h2>${esc(F.current.name)}</h2><p>${esc(dept(F.current.department))} · ${esc(F.current.phone)}</p></div></section><section class="card menu-card"><button class="list-item" data-role-sheet><span class="grow"><b>当前身份</b><small>${esc(F.roles[F.role])}</small></span>${icon('chevron')}</button>${links.map(([route,title,count]) => `<button class="list-item" data-go="${route}"><span class="grow">${title}</span><span>${count} ${icon('chevron')}</span></button>`).join('')}</section><details class="demo-tools mt"><summary>演示工具</summary><button class="btn ghost wide" data-reset>恢复初始演示数据</button><small>仅用于重新开始演示；关闭或刷新页面同样会恢复。</small></details><button class="link wide mt" data-logout>退出登录</button><div class="version">车辆调度 Demo V3.0 · 纯离线演示版</div>`;
  }

  function peoplePage() {
    pageHeader('人员与权限'); bottomNav('profile');
    const keyword = state.personSearch.trim().toLowerCase();
    const users = F.db.users.filter((item) => !keyword || [item.name, item.account, dept(item.department)].some((value) => String(value).toLowerCase().includes(keyword)));
    app.innerHTML = `<div class="row"><div><h1>人员账号</h1><small>演示 ${F.db.users.length} 个账号</small></div><button class="btn mini" data-go="departments">部门管理</button></div><form class="search" data-form="personSearch">${icon('search')}<input name="keyword" value="${esc(state.personSearch)}" placeholder="搜索姓名、部门、账号"><button class="link" type="submit">搜索</button></form><section class="card">${users.map((u) => `<button class="list-item" data-edit-user="${u.id}"><span class="avatar">${esc(u.name.slice(0,1))}</span><span class="grow"><b>${esc(u.name)}</b><small>${esc(dept(u.department))} · ${u.roles.map((r) => F.roles[r]).join('/')}</small></span>${badge(u.status === 'active' ? '已启用' : u.status)}${icon('chevron')}</button>`).join('') || empty('未找到匹配人员')}</section>`;
  }
  function departmentsPage() {
    pageHeader('部门管理'); bottomNav('profile');
    app.innerHTML = `<div class="row"><div class="page-lead"><h1>部门与负责人</h1><p>每个部门固定绑定一名负责人，仅能审批本部门用车申请。</p></div><button class="btn mini" data-add-department>${icon('plus')}新增</button></div><div class="stack">${F.db.departments.map((d) => {
      const leader = F.user(d.leader);
      const memberCount = F.db.users.filter((u) => u.department === d.id && u.status === 'active').length;
      return `<section class="card"><div class="row"><div><b>${esc(d.name)}</b><small>在职人员 ${memberCount} 人</small></div>${badge(leader ? '已绑定' : '待绑定')}</div><button class="list-item" data-edit-department="${d.id}"><span class="grow"><b>固定部门负责人</b><small>${esc(leader?.name || '未设置')}</small></span>${icon('chevron')}</button><button class="list-item" data-delete-department="${d.id}"><span class="grow danger-text">删除部门</span>${icon('chevron')}</button></section>`;
    }).join('')}</div><div class="hint mt">删除仅限没有在职人员、没有历史用车单的部门；更换负责人不会改写既有记录。</div>`;
  }
  function importPage() {
    pageHeader('批量导入'); bottomNav('profile');
    app.innerHTML = `<div class="page-lead"><h1>数据导入</h1><p>正式系统支持 Excel；本演示用示例数据展示预检流程。</p></div><section class="card import-box">${icon('upload')}<h3>选择车辆资产表</h3><p>按车牌号新增或更新，不会自动删除原车辆</p><button class="btn secondary" data-preview-import>载入示例表格</button></section><div id="import-preview"></div><div class="section-title"><h2>导入规则</h2></div><div class="hint">必填：车牌号、车型、车辆性质、型号。系统先展示新增、更新和错误数量，确认后再执行。</div>`;
  }
  function exportsPage() {
    pageHeader('数据导出'); bottomNav('profile');
    const items = [['trips','用车与审批记录','含申请、部门、车牌与状态'],['vehicles','车辆资产信息','车辆类型、性质、车况和状态'],['fuels','加油对账表','加油人、车牌、金额和油号'],['repairs','维修全过程','报价、最终金额和维修状态'],['departments','部门用车汇总','按部门统计申请、完成与使用中数量'],['logs','系统操作日志','仅系统管理员可导出']];
    app.innerHTML = `<div class="page-lead"><h1>报表导出</h1><p>导出 CSV，可直接用表格软件打开</p></div><section class="card">${items.filter(([k]) => k !== 'logs' || F.role === 'system').map(([k,t,s]) => `<button class="list-item" data-export="${k}">${icon('download')}<span class="grow"><b>${t}</b><small>${s}</small></span>${icon('chevron')}</button>`).join('')}</section>`;
  }
  function logsPage() {
    pageHeader('操作日志'); bottomNav('profile');
    app.innerHTML = `<div class="row"><div><h1>安全审计</h1><small>所有关键操作自动留痕</small></div><button class="link" data-export="logs">导出</button></div><div class="stack mt">${F.db.logs.map((x) => `<div class="card"><b>${esc(x.action)}</b><p>${esc(x.object)} ${esc(x.detail)}</p><small>${esc(username(x.actor))} · ${esc(F.roles[x.role] || x.role)} · ${fmt(x.time)}</small></div>`).join('') || empty('暂无本次演示操作','完成审批、派车或登记后会产生记录')}</div>`;
  }
  function settingsPage() {
    pageHeader('系统设置'); bottomNav('profile');
    app.innerHTML = `<div class="page-lead"><h1>系统设置</h1><p>正式版由系统管理员配置</p></div><section class="card">${select('业务照片与凭证保留年限', 'retention', [['1','1 年'],['3','3 年'],['5','5 年'],['10','10 年']], String(F.db.settings.fileRetentionYears))}${field('超时提醒频率', 'frequency', 'text', '每天一次', 'disabled')}${field('提醒渠道', 'channel', 'text', '程序内消息', 'disabled')}<button class="btn wide" data-save-settings>保存设置</button></section><div class="hint warn mt">演示版不会保存到下次打开。正式系统需结合单位数据管理制度确定保留期限。</div>`;
  }

  function openSheet(title, body, submitText, formName) {
    sheet.innerHTML = `<div class="sheet-handle"></div><div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close>×</button></div><form data-sheet-form="${formName}"><div class="sheet-body">${body}</div><div class="sheet-footer"><button class="btn wide" type="submit">${esc(submitText)}</button></div></form>`;
    sheet.showModal();
  }
  function workflowDetails(title, subtitle, flow) {
    return `<details class="flow-details"><summary><span><b>${esc(title)}</b><small>${esc(subtitle)} · ${flow.length} 个节点</small></span><span class="flow-toggle">展开</span></summary><section class="card flow-list">${flow.map((node, index) => `<div class="flow-node ${node.state}"><span class="flow-mark">${node.state === 'done' ? icon('check') : node.state === 'current' ? index + 1 : node.state === 'rejected' || node.state === 'cancelled' ? '×' : index + 1}</span><span class="grow"><b>${esc(node.title)}</b><small>${node.state === 'done' ? '已完成' : node.state === 'current' ? '当前待处理' : node.state === 'rejected' ? '已驳回' : node.state === 'cancelled' ? '已取消' : '待进行'}</small></span></div>`).join('')}</section></details>`;
  }
  function historyDetails(events) {
    const recent = events.slice(-3).reverse();
    const renderEvent = (e) => `<div class="event"><b>${esc(e.text)}</b>${e.auto ? '<span class="badge green">自动</span>' : ''}<small>${fmt(e.time)}${e.actor ? ` · ${esc(username(e.actor))}` : ''}</small></div>`;
    return `<details class="history-details"><summary><span><b>操作记录</b><small>全程留痕 · ${events.length} 条</small></span><span class="flow-toggle">展开</span></summary><section class="card timeline">${recent.map(renderEvent).join('') || empty('暂无操作记录')}${events.length > recent.length ? `<details class="history-more"><summary>查看更早 ${events.length - recent.length} 条记录</summary>${events.slice(0, -3).reverse().map(renderEvent).join('')}</details>` : ''}</section></details>`;
  }
  function roleSheet() {
    const roles = F.current.roles.includes('system') ? Object.keys(F.roles) : F.current.roles;
    openSheet('切换当前身份', roles.map((r) => `<button class="choice ${F.role === r ? 'active' : ''}" type="button" data-switch-role="${r}"><span class="avatar">${F.roles[r].slice(0,1)}</span><span><strong>${F.roles[r]}</strong><small>${roleDescription(r)}</small></span></button>`).join(''), '关闭', 'noop');
  }
  function departmentSheet(id) {
    const d = F.department(id); if (!d) return toast('部门不存在');
    state.departmentId = id;
    const candidates = F.db.users.filter((u) => u.department === id && u.status === 'active').map((u) => [u.id, `${u.name} · ${u.phone}`]);
    openSheet(`设置 ${d.name} 负责人`, `<div class="hint mb">负责人仅能审批和查看本部门的用车申请。</div>${select('固定部门负责人', 'leader', candidates, d.leader)}`, '保存负责人', 'departmentLeader');
  }
  function departmentCreateSheet() {
    openSheet('新增部门', `${field('部门名称', 'name', 'text', '', 'placeholder="如：法制支队" required')}<div class="hint mt">新增后请在部门卡片中设置固定负责人。</div>`, '新增部门', 'departmentCreate');
  }
  function userAccessSheet(id) {
    const person = F.user(id); if (!person) return toast('人员不存在');
    state.personId = id;
    const roleChecks = Object.entries(F.roles).filter(([key]) => key !== 'leader').map(([key, label]) => `<label class="check"><input type="checkbox" name="roles" value="${key}" ${person.roles.includes(key) ? 'checked' : ''}><span><b>${esc(label)}</b></span></label>`).join('');
    const fixedLeader = F.db.departments.some((item) => item.leader === person.id);
    openSheet('账号与权限管理', `<section class="card mb">${detailRow('姓名', esc(person.name))}${detailRow('部门', esc(dept(person.department)))}${detailRow('账号', esc(person.account))}</section><div class="hint mb">部门负责人由部门管理维护${fixedLeader ? '；该人员当前为固定负责人，不能在此页停用或移除负责人身份。' : '。'}</div><div class="section-title"><h2>分配角色</h2><span class="meta">至少一项</span></div>${roleChecks}${select('账号状态', 'status', [['active','已启用'],['inactive','已停用'],['pending','待审核']], person.status)}<button type="button" class="btn ghost wide mb" data-reset-user="${person.id}">重置密码为 Demo123!</button>`, '保存账号与权限', 'userAccess');
  }
  const roleDescription = (r) => ({ user:'申请用车、加油和归还',leader:'审批本部门用车',director:'车型、维修和数据管理',chief:'处级审批及主任权限',driver:'派车与归还确认',mechanic:'报修和维修验收',garage:'报价与维修完工',system:'账号、权限和审计' })[r];

  const quoteItemTotal = (item) => Math.max(0, Number(item?.quantity) || 0) * Math.max(0, Number(item?.unitPrice) || 0);
  const quoteDraftTotal = () => state.quoteItems.reduce((sum, item) => sum + quoteItemTotal(item), 0);
  function renderQuoteEditor() {
    const editor = $('#quote-editor'); if (!editor) return;
    editor.innerHTML = `<div class="quote-editor-head"><b>维修工程报价明细</b><small>逐项填写，金额自动汇总</small></div><div class="quote-lines">${state.quoteItems.map((item, index) => `<div class="quote-line"><input class="quote-project" data-quote-field="name" data-quote-index="${index}" value="${esc(item.name)}" placeholder="维修项目名称"><div class="quote-fields"><label>单位<input data-quote-field="unit" data-quote-index="${index}" value="${esc(item.unit)}" placeholder="如：项"></label><label>数量<input data-quote-field="quantity" data-quote-index="${index}" type="number" min="0.01" step="0.01" value="${esc(item.quantity)}"></label><label>单价（元）<input data-quote-field="unitPrice" data-quote-index="${index}" type="number" min="0.01" step="0.01" value="${esc(item.unitPrice)}" placeholder="0.00"></label></div><div class="quote-line-footer"><span>项目小计 <b id="quote-subtotal-${index}">¥${quoteItemTotal(item).toFixed(2)}</b></span><button type="button" class="quote-remove" data-quote-remove="${index}" ${state.quoteItems.length === 1 ? 'disabled' : ''}>删除本项</button></div></div>`).join('')}</div><div class="quote-total">报价合计 <b id="quote-total">¥${quoteDraftTotal().toFixed(2)}</b></div><button type="button" class="btn secondary wide quote-add" data-quote-add>+ 添加报价项目</button>`;
  }
  function quoteDetailSheet(id) {
    const x = F.repair(id); if (!x?.quoteItems?.length) return toast('暂无维修报价明细');
    openSheet('维修工程报价单', `<div class="hint mb">${esc(F.vehicle(x.vehicle)?.plate || '')} · 共 ${x.quoteItems.length} 个项目</div><div class="quote-readonly"><div class="quote-readonly-head"><span>项目</span><span>数量 × 单价</span><span>小计</span></div>${x.quoteItems.map((item) => `<div class="quote-readonly-row"><span>${esc(item.name)}<small>${esc(item.unit)}</small></span><span>${item.quantity} × ¥${Number(item.unitPrice).toFixed(2)}</span><b>¥${Number(item.subtotal).toFixed(2)}</b></div>`).join('')}<div class="quote-total">报价合计 <b>¥${Number(x.quoteAmount).toFixed(2)}</b></div></div>${x.quoteNote ? `<div class="hint mt">报价说明：${esc(x.quoteNote)}</div>` : ''}`, '关闭', 'noop');
  }

  function tripSheet(action) {
    const x = F.trip(state.id); const types = ['轿车','SUV','商务车','客车','货车','其他'];
    if (action === 'setType') {
      const counts = F.availableVehicleCounts(x); const selected = counts[x.preferredType] ? x.preferredType : types.find((type) => counts[type] > 0) || '';
      openSheet('确定派车车型', `<label class="field"><span>主任分配车型</span><select name="assignedType">${types.map((type) => `<option value="${type}" ${type === selected ? 'selected' : ''} ${counts[type] ? '' : 'disabled'}>${type}（${counts[type] ? `可用 ${counts[type]} 辆` : '暂无可用车辆'}）</option>`).join('')}</select></label><div class="hint warn">按本次申请的用车时段计算余量；无可用车辆的车型已置灰，无法继续派车。</div>`, '通过并送下一环节', 'tripSetType');
      if (!selected) $('#sheet button[type="submit"]').disabled = true;
    }
    else if (action === 'rejectTrip') openSheet('驳回申请', textarea('驳回原因', 'reason', '', '请说明原因'), '确认驳回', 'tripReject');
    else if (action === 'assignVehicle') {
      const cars = F.eligibleDispatchVehicles(x);
      const body = `<div class="hint mb">主任已确定为“${esc(x.assignedType)}”。仅显示该车型且当前可派的车辆。</div>` + (cars.length ? select('选择车牌', 'vehicle', cars.map((v) => [v.id, `${v.plate} · ${v.type} · ${v.model}`])) : `<div class="hint warn">该车型当前没有可派车辆，请由车管中心主任重新确定车型。</div>`);
      openSheet('司机班派车', body, '确认派车', 'tripAssign');
      if (!cars.length) $('#sheet button[type="submit"]').disabled = true;
    } else if (action === 'returnTrip') openSheet('提交车辆归还', `<div class="photo-capture"><button type="button" class="capture" data-photo="front">${icon('camera')}<span>拍摄车辆前方</span><small id="front-photo">必须上传</small></button><button type="button" class="capture" data-photo="rear">${icon('camera')}<span>拍摄车辆后方</span><small id="rear-photo">必须上传</small></button></div>${field('归还公里数（选填）','mileage','number','','placeholder="当前里程"')}`, '提交司机班确认', 'tripReturn');
    else if (action === 'confirmReturn') openSheet('归还检查', select('车辆外观','exterior',[['正常','正常'],['异常','异常']],'正常') + select('卫生状况','hygiene',[['良好','良好'],['较差','较差']],'良好') + select('重要部件','parts',[['完整','完整'],['缺失','缺失'],['损坏','损坏']],'完整') + select('燃油余量','fuelLevel',[['其他','其他 / 未填写'],['50%以上','50%以上'],['50%以下','50%以下']],'其他') + textarea('异常说明','note','','任一项异常时必须填写'), '确认收车', 'tripConfirmReturn');
  }

  function repairSheet(action) {
    const x = F.repair(state.id); const garages = F.db.users.filter((u) => u.roles.includes('garage')).map((u) => [u.id, u.garageName]);
    if (action === 'assignGarage') openSheet('分派修理厂', select('本次只选择一家修理厂','garage',garages), '确认分派', 'repairAssign');
    else if (action === 'submitQuote') {
      state.quoteItems = [{ name: '', unit: '项', quantity: 1, unitPrice: '' }];
      openSheet('提交维修报价', `<div id="quote-editor"></div>${textarea('报价说明','note','','可填写维修范围、配件品牌等')}` + `<button type="button" class="capture wide-capture" data-proof="quote">${icon('camera')}<span>拍摄 / 选择报价单</span><small id="quote-proof">必须上传</small></button>`, '提交主任审核', 'repairQuote');
      renderQuoteEditor();
    }
    else if (action === 'directorDecision') {
      const highQuote = x.quoteAmount > 5000;
      const directorDecisions = highQuote ? [['escalate','上送车辆中心处长审核'],['requote','打回重新报价'],['change','更换修理厂'],['reject','直接驳回并终结']] : [['approve','同意维修'],['requote','打回重新报价'],['change','更换修理厂'],['escalate','上送车辆中心处长审核'],['reject','直接驳回并终结']];
      openSheet('主任审核报价', `<div class="hint warn mb">报价 ¥${x.quoteAmount}。超过 5000 元不能直接同意，必须上送车辆中心处长。</div><button type="button" class="btn secondary wide mb" data-quote-view="${x.id}">查看维修工程报价单</button>${select('处理结果','decision',directorDecisions)}${select('新修理厂（更换时）','garage',[['','请选择'],...garages])}${textarea('处理意见 / 驳回原因','reason')}`, '确认处理', 'repairDirector');
    }
    else if (action === 'chiefDecision') openSheet('车辆中心处长审核报价', select('处理结果','decision',[['approve','同意维修'],['requote','打回重新报价'],['change','退回主任更换修理厂'],['reject','直接驳回并终结']]) + textarea('处理意见 / 驳回原因','reason'), '确认处理', 'repairChief');
    else if (action === 'completeRepair') openSheet('登记维修完成', textarea('实际维修内容','content','','填写实际更换部件和维修内容') + field('最终金额（元）','actualAmount','number',x.quoteAmount || '','min="0.01" step="0.01"') + `<button type="button" class="capture wide-capture" data-proof="complete">${icon('camera')}<span>上传结算 / 完工凭证</span><small id="complete-proof">必须上传</small></button>`, '提交验收', 'repairComplete');
    else if (action === 'directorFinal') openSheet('复核最终金额', `<div class="hint warn mb">报价 ¥${x.quoteAmount}，最终金额 ¥${x.actualAmount}</div>${select('处理结果','decision',[['approve','同意最终金额'],['reject','退回修理厂修改'],['escalate','上送车辆中心处长审核']])}${textarea('处理意见','reason')}`, '确认处理', 'repairDirectorFinal');
    else if (action === 'chiefFinal') openSheet('车辆中心处长复核金额', select('处理结果','decision',[['approve','同意最终金额'],['reject','退回修理厂修改']]) + textarea('处理意见','reason'), '确认处理', 'repairChiefFinal');
    else if (action === 'acceptRepair') openSheet('修理工验车收车', select('验收结果','result',[['良好','良好，可正常派车'],['仍需观察','仍需观察，可派车但提示'],['维修未通过','维修未通过，退回修理厂']]), '确认验收', 'repairAccept');
  }

  function fuelSheet(mode) {
    const supplement = mode === 'supplement';
    const cars = supplement ? F.db.vehicles : F.eligibleFuelVehicles(F.current.id, F.day());
    openSheet(supplement ? '车管中心补登加油' : '登记加油', select('车牌号','vehicle',cars.map((v) => [v.id, `${v.plate} · ${v.model}`])) + field('加油金额（元）','amount','number','','min="0.01" step="0.01"') + select('油号','fuelType',[['92#汽油','92#汽油'],['95#汽油','95#汽油'],['98#汽油','98#汽油'],['0#柴油','0#柴油'],['其他','其他']]) + field('加油时间','time','datetime-local',`${F.day()}T12:00`) + (supplement ? select('实际用车人','user',F.db.users.filter((u) => u.roles.includes('user')).map((u) => [u.id, `${u.name} · ${dept(u.department)}`])) + textarea('补登原因','reason','','必填') : ''), supplement ? '确认补登' : '保存加油记录', supplement ? 'fuelSupplement' : 'fuelAdd');
  }

  const valuesOf = (form) => Object.fromEntries(new FormData(form).entries());
  function perform(fn, success, after = render) { try { fn(); sheet.open && sheet.close(); state.photos = []; state.quoteItems = []; toast(success); after(); } catch (error) { toast(error.message); } }
  function submitForm(form) {
    const values = valuesOf(form), name = form.dataset.form || form.dataset.sheetForm;
    if (name === 'login') return perform(() => F.login(values.account, values.password), '登录成功', () => go('home','',true));
    if (name === 'vehicleSearch') { state.vehicleQuery = values.keyword || ''; state.vehicleType = values.type || ''; state.vehicleNature = values.nature || ''; state.vehicleCondition = values.condition || ''; return render(); }
    if (name === 'tripApply') return perform(() => { const x = F.createTrip(values); state.id = x.id; }, '申请已提交', () => go('trip', state.id, true));
    if (name === 'repairApply') return perform(() => { const x = F.createRepair({ ...values, stopNow: !!form.elements.stopNow.checked }); state.id = x.id; }, '维修申请已提交', () => go('repair', state.id, true));
    if (name === 'tripSetType') return perform(() => F.tripAction(state.id,'directorApprove',values),'车型已确定');
    if (name === 'tripReject') return perform(() => F.tripAction(state.id,'reject',values),'申请已驳回');
    if (name === 'tripAssign') return perform(() => F.tripAction(state.id,'driverAssign',values),'派车成功');
    if (name === 'tripReturn') return perform(() => F.tripAction(state.id,'submitReturn',{ ...values, photos: state.photos }),'已提交归还');
    if (name === 'tripConfirmReturn') return perform(() => F.tripAction(state.id,'confirmReturn',values),'归还确认完成');
    if (name === 'fuelAdd') return perform(() => F.fuelAction('add',values),'加油记录已保存');
    if (name === 'fuelSupplement') return perform(() => F.fuelAction('supplement',values),'补登完成');
    if (name === 'repairAssign') return perform(() => F.repairAction(state.id,'assignGarage',values),'已分派修理厂');
    if (name === 'repairQuote') return perform(() => F.repairAction(state.id,'submitQuote',{ ...values, quoteItems: state.quoteItems, photo: state.photos[0] }),'报价已提交');
    if (name === 'repairDirector') return perform(() => F.repairAction(state.id,'directorDecision',values),'审核操作完成');
    if (name === 'repairChief') return perform(() => F.repairAction(state.id,'chiefDecision',values),'车辆中心处长审批完成');
    if (name === 'repairComplete') return perform(() => F.repairAction(state.id,'complete',{ ...values, proof: state.photos[0] }),'完工信息已提交');
    if (name === 'repairDirectorFinal') return perform(() => F.repairAction(state.id,'directorFinal',values),'最终金额已处理');
    if (name === 'repairChiefFinal') return perform(() => F.repairAction(state.id,'chiefFinal',values),'车辆中心处长复核完成');
    if (name === 'repairAccept') return perform(() => F.repairAction(state.id,'accept',values),'验收结果已保存');
    if (name === 'departmentLeader') return perform(() => F.updateDepartmentLeader(state.departmentId, values.leader), '部门负责人已更新');
    if (name === 'departmentCreate') return perform(() => F.createDepartment(values.name), '部门已新增');
    if (name === 'personSearch') { state.personSearch = values.keyword || ''; return render(); }
    if (name === 'userAccess') {
      const roles = Array.from(form.querySelectorAll('input[name="roles"]:checked')).map((input) => input.value);
      if (F.db.departments.some((item) => item.leader === state.personId)) roles.push('leader');
      return perform(() => F.updateUserAccess(state.personId, { roles, status: values.status }), '账号与权限已更新');
    }
    if (name === 'noop') return sheet.close();
  }

  function csv(kind, rows) {
    if (!rows.length) return toast('暂无可导出的数据');
    const heads = Object.keys(rows[0]);
    const text = '\ufeff' + [heads, ...rows.map((row) => heads.map((h) => row[h] ?? ''))].map((line) => line.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `车辆调度_${kind}_${F.day()}.csv`; link.click(); URL.revokeObjectURL(url); toast('已生成导出文件');
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button,[data-open-trip],[data-open-repair],[data-open-vehicle]'); if (!target) return;
    if (target.dataset.go) go(target.dataset.go);
    else if (target.dataset.back !== undefined) back();
    else if (target.dataset.openTrip) go('trip',target.dataset.openTrip);
    else if (target.dataset.openRepair) go('repair',target.dataset.openRepair);
    else if (target.dataset.openVehicle) go('vehicle',target.dataset.openVehicle);
    else if (target.dataset.editDepartment) departmentSheet(target.dataset.editDepartment);
    else if (target.dataset.addDepartment !== undefined) departmentCreateSheet();
    else if (target.dataset.deleteDepartment) {
      const d = F.department(target.dataset.deleteDepartment);
      if (d && window.confirm(`确认删除“${d.name}”？仅无人员、无历史用车单的部门可删除。`)) perform(() => F.deleteDepartment(d.id), '部门已删除');
    }
    else if (target.dataset.filter) { state.filter = target.dataset.filter; render(); }
    else if (target.dataset.repairFilter) { state.repairFilter = target.dataset.repairFilter; render(); }
    else if (target.dataset.vehicleFilter) { state.vehicleFilter = target.dataset.vehicleFilter; render(); }
    else if (target.dataset.clearVehicleFilters !== undefined) { state.vehicleQuery = ''; state.vehicleType = ''; state.vehicleNature = ''; state.vehicleCondition = ''; state.vehicleFilter = 'all'; render(); }
    else if (target.dataset.messageFilter) { state.messageFilter = target.dataset.messageFilter; render(); }
    else if (target.dataset.editUser) userAccessSheet(target.dataset.editUser);
    else if (target.dataset.resetUser) perform(() => F.resetUserPassword(target.dataset.resetUser), '密码已重置为 Demo123!', () => { sheet.close(); render(); });
    else if (target.dataset.roleSheet !== undefined) roleSheet();
    else if (target.dataset.switchRole) perform(() => F.switchRole(target.dataset.switchRole),`已切换为${F.roles[target.dataset.switchRole]}`,() => go('home','',true));
    else if (target.dataset.close !== undefined) sheet.close();
    else if (target.dataset.quoteView) quoteDetailSheet(target.dataset.quoteView);
    else if (target.dataset.quoteAdd !== undefined) { state.quoteItems.push({ name: '', unit: '项', quantity: 1, unitPrice: '' }); renderQuoteEditor(); }
    else if (target.dataset.quoteRemove !== undefined) { state.quoteItems.splice(Number(target.dataset.quoteRemove), 1); renderQuoteEditor(); }
    else if (target.dataset.tripAction) {
      const a = target.dataset.tripAction;
      if (a === 'approveTrip') perform(() => F.tripAction(state.id,'deptApprove'),'部门审批通过');
      else if (a === 'chiefApprove') perform(() => F.tripAction(state.id,'chiefApprove'),'车辆中心处长审批通过');
      else if (a === 'startTrip') perform(() => F.tripAction(state.id,'start'),'用车已开始');
      else if (a === 'cancelTrip') perform(() => F.tripAction(state.id,'cancel'),'申请已取消');
      else tripSheet(a);
    } else if (target.dataset.repairAction) repairSheet(target.dataset.repairAction);
    else if (target.dataset.fuelAdd) fuelSheet(target.dataset.fuelAdd);
    else if (target.dataset.photo) { if (!state.photos.includes(target.dataset.photo)) state.photos.push(target.dataset.photo); $(`#${target.dataset.photo}-photo`).textContent = '已拍摄'; target.classList.add('captured'); }
    else if (target.dataset.proof) { state.photos = [`${target.dataset.proof}-demo.jpg`]; $(`#${target.dataset.proof}-proof`).textContent = '已上传演示照片'; target.classList.add('captured'); }
    else if (target.dataset.export) perform(() => csv(target.dataset.export,F.exportRows(target.dataset.export)),'正在导出',()=>{});
    else if (target.dataset.exportLedger) { const rows = F.vehicleLedger(target.dataset.exportLedger).map((x) => ({ 类型:x.kind, 时间:x.time, 内容:x.title, 状态:x.status, 单号:x.id })); csv('车辆台账',rows); }
    else if (target.dataset.previewImport !== undefined) {
      const sample = [
        { plate:'冀C·B2088', model:'别克GL8（更新）', type:'商务车', nature:'便车', seats:7 },
        { plate:'冀C·J1028', model:'红旗H9', type:'轿车', nature:'警车', seats:5 },
        { plate:'冀C·K3270', model:'大众揽境', type:'SUV', nature:'便车', seats:7 },
        { plate:'冀C·L5061', model:'宇通客车', type:'客车', nature:'警车', seats:35 },
        { plate:'', model:'错误行', type:'轿车', nature:'便车' }
      ];
      perform(() => { state.importPreview = F.previewVehicleImport(sample); }, '预检完成', () => {
        const p = state.importPreview;
        $('#import-preview').innerHTML = `<div class="section-title"><h2>预检结果</h2>${badge('可导入')}</div><section class="card"><div class="import-stats"><b>${sample.length}<small>数据行</small></b><b>${p.adds.length}<small>新增</small></b><b>${p.updates.length}<small>更新</small></b><b class="red-text">${p.errors.length}<small>错误</small></b></div><div class="hint warn mt">${p.errors.length ? `第 ${p.errors[0].row} 行：${esc(p.errors[0].message)}` : '未发现错误'}</div><button class="btn wide mt" data-apply-import>导入 ${p.adds.length + p.updates.length} 条有效数据</button></section>`;
      });
    }
    else if (target.dataset.applyImport !== undefined) perform(() => F.applyVehicleImport(state.importPreview),'演示导入完成',() => go('vehicles','',true));
    else if (target.dataset.saveSettings !== undefined) { F.db.settings.fileRetentionYears = +$('select[name=retention]').value; toast('设置已更新（仅本次演示）'); }
    else if (target.dataset.reset !== undefined) { F.reset(); state.history = []; toast('已恢复初始演示数据'); go('home','',true); }
    else if (target.dataset.logout !== undefined) { F.logout(); state.history = []; go('login','',true); }
    else if (target.dataset.wechat !== undefined) perform(() => F.login($('select[name=account]').value,'',true),'微信授权成功（模拟）',() => go('home','',true));
    else if (target.dataset.notice) { F.markRead(target.dataset.notice); const [kind,id] = target.dataset.target.split(':'); go(kind === 'trip' ? 'trip' : 'repair',id); }
  });
  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.dataset.quoteField) return;
    const item = state.quoteItems[Number(input.dataset.quoteIndex)]; if (!item) return;
    item[input.dataset.quoteField] = input.value;
    const subtotal = $(`#quote-subtotal-${input.dataset.quoteIndex}`); if (subtotal) subtotal.textContent = `¥${quoteItemTotal(item).toFixed(2)}`;
    const total = $('#quote-total'); if (total) total.textContent = `¥${quoteDraftTotal().toFixed(2)}`;
  });
  document.addEventListener('submit', (event) => { event.preventDefault(); submitForm(event.target); });
  setInterval(() => { const d = new Date(); $('#clock').textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }, 30000);
  render();
})();
