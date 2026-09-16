/* Session-only fictional demonstration data. No network or persistent storage. */
const Fleet=(()=>{
 const roles={user:'普通用户',admin:'行政管理员',asset:'资产管理员',system:'系统管理员'};
 const states={pending:'待审批',assigned:'待用车',using:'使用中',returning:'待归还确认',done:'已完成',rejected:'已驳回',cancelled:'已取消'};
 const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const at=(offset,time)=>`${day(offset)}T${time}`;
 let db,current=null,role='user',serial=20;
 const seed=()=>{
 db={users:[
 {id:'u1',name:'王敏',account:'wangmin',department:'综合管理部',roles:['user','admin','asset','system'],status:'active',test:false},
 {id:'u2',name:'张三',account:'zhangsan',department:'市场部',roles:['user'],status:'active',test:true},
 {id:'u3',name:'李晴',account:'liqing',department:'行政部',roles:['user','admin'],status:'active',test:true},
 {id:'u4',name:'陈远',account:'chenyuan',department:'资产部',roles:['user','asset'],status:'active',test:true},
 {id:'u5',name:'赵宁',account:'zhaoning',department:'技术部',roles:['user'],status:'pending',reason:'项目现场走访，需要申请用车。',phone:'13800000005',test:true},
 {id:'u6',name:'周琳',account:'zhoulin',department:'项目部',roles:['user'],status:'disabled',test:true}
 ].map(u=>({...u,password:'Demo123!',mustReset:false})),vehicles:[
 {id:'v1',plate:'京A·D1026',model:'大众 帕萨特',seats:5,unit:'集团总部',purchase:'2022-06-15',inspection:day(180),insurance:day(210),condition:'良好',status:'正常',photos:[],files:[],repairs:[{date:day(-30),text:'常规保养，更换机油及滤芯',result:'已完成'}],test:true},
 {id:'v2',plate:'京A·F2088',model:'别克 GL8',seats:7,unit:'集团总部',purchase:'2023-02-10',inspection:day(150),insurance:day(120),condition:'良好',status:'正常',photos:[],files:[],repairs:[],test:true},
 {id:'v3',plate:'京A·E3066',model:'比亚迪 汉',seats:5,unit:'集团总部',purchase:'2024-04-20',inspection:day(260),insurance:day(200),condition:'良好',status:'正常',photos:[],files:[],repairs:[],test:true},
 {id:'v4',plate:'京A·B5102',model:'丰田 凯美瑞',seats:5,unit:'分公司',purchase:'2020-09-01',inspection:day(90),insurance:day(100),condition:'待检修',status:'维修中',photos:[],files:[],repairs:[{date:day(-1),text:'制动系统检修',result:'维修中'}],test:true},
 {id:'v5',plate:'京A·C6079',model:'本田 雅阁',seats:5,unit:'分公司',purchase:'2019-07-12',inspection:day(-5),insurance:day(40),condition:'良好',status:'正常',photos:[],files:[],repairs:[],test:true},
 {id:'v6',plate:'京A·H8021',model:'大众 迈腾',seats:5,unit:'集团总部',purchase:'2021-08-10',inspection:day(100),insurance:day(-2),condition:'异常',status:'停用',photos:[],files:[],repairs:[],test:true},
 {id:'v7',plate:'京A·J9018',model:'别克 君越',seats:5,unit:'集团总部',purchase:'2024-03-10',inspection:day(200),insurance:day(250),condition:'良好',status:'正常',photos:[],files:[],repairs:[],test:true}
 ],orders:[
 {id:'YC1001',user:'u1',purpose:'客户现场需求沟通',destination:'朝阳区 · 客户办公园区',start:at(1,'09:00'),end:at(1,'17:00'),status:'pending',note:'携带项目资料',vehicle:null},
 {id:'YC1002',user:'u2',purpose:'合作伙伴来访接待',destination:'首都机场 → 总部',start:at(0,'08:00'),end:at(0,'18:00'),status:'using',vehicle:'v2'},
 {id:'YC1003',user:'u2',purpose:'区域客户拜访',destination:'海淀区 · 科技园',start:at(1,'10:00'),end:at(1,'16:00'),status:'pending',vehicle:null},
 {id:'YC1004',user:'u1',purpose:'项目资料交接',destination:'亦庄项目现场',start:at(0,'09:00'),end:at(0,'17:00'),status:'assigned',vehicle:'v1'},
 {id:'YC1005',user:'u3',purpose:'会议物料运输',destination:'城市会展中心',start:at(-1,'08:00'),end:at(-1,'18:00'),status:'returning',vehicle:'v3'},
 {id:'YC1006',user:'u1',purpose:'分公司业务交流',destination:'分公司办公楼',start:at(-4,'09:00'),end:at(-4,'17:00'),status:'done',vehicle:'v1'},
 {id:'YC1007',user:'u1',purpose:'临时外出',destination:'西城区',start:at(-2,'09:00'),end:at(-2,'15:00'),status:'rejected',vehicle:null,reason:'请补充具体公务事由后重新申请。'}
 ].map(o=>({...o,test:true,events:[{text:'提交用车申请',time:at(-1,'08:30')},...(o.status!=='pending'?[{text:states[o.status],time:at(0,'08:00')}]:[])]})),logs:[]};
 serial=20;
 };
 seed();
 const user=id=>db.users.find(u=>u.id===id),vehicle=id=>db.vehicles.find(v=>v.id===id),order=id=>db.orders.find(o=>o.id===id);
 const can=r=>!!current&&current.status==='active'&&(current.roles.includes('system')||current.roles.includes(r));
 const requireRole=r=>{if(!can(r))throw Error('当前账号没有此操作权限');};
 const log=(action,object)=>db.logs.unshift({time:new Date().toLocaleString('zh-CN'),actor:current?.name||'新用户',action,object});
 const event=(o,text)=>{o.events.push({text,time:new Date().toLocaleString('zh-CN')});log(text,o.id)};
 const validTime=(start,end)=>{if(!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||start>=end)throw Error('预计结束时间必须晚于开始时间');};
 const blocked=(v,start,end,exclude)=>{
 let reasons=[];if(v.status!=='正常')reasons.push(v.status);if(v.condition!=='良好')reasons.push('健康状态不可派');
 if(v.inspection<end.slice(0,10))reasons.push('年检未覆盖用车日期');if(v.insurance<end.slice(0,10))reasons.push('保险未覆盖用车日期');
 if(db.orders.some(o=>o.id!==exclude&&o.vehicle===v.id&&['assigned','using','returning'].includes(o.status)&&((o.start<end&&start<o.end)||(['using','returning'].includes(o.status)&&Date.parse(o.end)<Date.now()))))reasons.push('该时段已占用或尚未归还');
 return reasons;
 };
 const available=(start,end,exclude)=>db.vehicles.filter(v=>!blocked(v,start,end,exclude).length);
 const login=(account,password,wechat=false)=>{const u=db.users.find(u=>u.account===account);if(!u||(!wechat&&u.password!==password))throw Error('账号或密码不正确');current=u;role=u.roles.includes('user')?'user':u.roles[0]||'user';return u};
 const switchRole=r=>{requireRole(r);role=r};
 const saveOrder=(values,id)=>{requireRole('user');validTime(values.start,values.end);if(!values.purpose?.trim()||!values.destination?.trim())throw Error('请填写用途和目的地/行程');let o=id?order(id):null;if(id&&(!o||o.user!==current.id||o.status!=='pending'))throw Error('只能修改自己的待审批申请');if(o){Object.assign(o,values);event(o,'修改申请')}else{o={...values,id:'YC'+(1100+serial++),user:current.id,status:'pending',vehicle:null,test:true,events:[]};db.orders.unshift(o);event(o,'提交用车申请')}return o};
 const transition=(id,action,values={})=>{const o=order(id);if(!o)throw Error('申请不存在');const own=o.user===current?.id;
 if(action==='cancel'){requireRole('user');if(!own||o.status!=='pending')throw Error('只能取消自己的待审批申请');o.status='cancelled';event(o,'取消申请');}
 if(['assign','reject','reassign','confirm'].includes(action))requireRole('admin');
 if(action==='assign'||action==='reassign'){if(o.status!==(action==='assign'?'pending':'assigned'))throw Error('当前状态不能派车或改派');const v=vehicle(values.vehicle);if(!v)throw Error('请选择车辆');const errors=blocked(v,o.start,o.end,o.id);if(errors.length)throw Error(errors.join('、'));const old=vehicle(o.vehicle);o.vehicle=v.id;o.status='assigned';o.approvalNote=values.note;event(o,(action==='assign'?'审批通过并派车：':'改派：'+(old?.plate||'')+' → ')+v.plate+(values.note?'；'+values.note:''));}
 if(action==='reject'){if(o.status!=='pending'||!values.reason?.trim())throw Error('请填写驳回原因，仅待审批申请可驳回');o.status='rejected';o.reason=values.reason;event(o,'驳回申请：'+values.reason);}
 if(action==='start'){requireRole('user');if(!own||o.status!=='assigned')throw Error('不能开始此订单');const v=vehicle(o.vehicle);if(!v||blocked(v,o.start,o.end,o.id).length)throw Error('车辆当前不可用，请联系行政改派');o.status='using';o.actualStart=new Date().toLocaleString('zh-CN');event(o,'开始用车');}
 if(action==='return'){requireRole('user');if(!own||o.status!=='using')throw Error('不能提交此订单归还');o.status='returning';event(o,'提交归还，等待行政确认');}
 if(action==='confirm'){if(o.status!=='returning')throw Error('仅待归还确认订单可完成');o.status='done';o.actualEnd=new Date().toLocaleString('zh-CN');event(o,'行政确认归还');}
 return o;
 };
 const saveVehicle=(values,id)=>{requireRole('asset');if(!values.plate?.trim()||!values.model?.trim()||!values.purchase||!values.inspection||!values.insurance||!values.unit?.trim())throw Error('请完整填写车辆资料');if(!Number.isInteger(+values.seats)||+values.seats<1)throw Error('座位数应为正整数');if(db.vehicles.some(v=>v.id!==id&&v.plate.replace(/[·\s]/g,'').toUpperCase()===values.plate.replace(/[·\s]/g,'').toUpperCase()))throw Error('车牌号已存在');let v=vehicle(id);if(v)Object.assign(v,values);else{v={...values,id:'v'+serial++,photos:[],files:[],repairs:[],test:true};db.vehicles.unshift(v)}log('维护车辆资料',v.plate);return v};
 return {roles,states,day,at,user,vehicle,order,can,requireRole,log,event,validTime,blocked,available,login,switchRole,saveOrder,transition,saveVehicle,get db(){return db},get current(){return current},get role(){return role},logout(){current=null;role='user'},reset(){seed();current=db.users[0];role='user';log('恢复演示数据','全部虚构样例')},nextId(){return 'u'+serial++}};
})();
if(typeof module!=='undefined')module.exports=Fleet;
