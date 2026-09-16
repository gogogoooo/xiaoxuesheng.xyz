export type ApparatusKind='battery'|'switch'|'resistor'|'ammeter'|'voltmeter'|'barMagnet'|'uMagnet'|'straightConductor'|'solenoid'|'compass';
export type Point={x:number;y:number};
export type Terminal={id:string;offset:Point};
export type Apparatus={id:string;kind:ApparatusKind;position:Point;rotation:0|90|180|270;terminals:Terminal[];params:Record<string,number|boolean>};
export type Wire={id:string;from:string;to:string};
export type ElectromagnetScene={version:1;apparatus:Apparatus[];wires:Wire[];running:boolean;showFieldLines:boolean;showCompasses:boolean};

const kinds=new Set<ApparatusKind>(['battery','switch','resistor','ammeter','voltmeter','barMagnet','uMagnet','straightConductor','solenoid','compass']);
const ids=()=>crypto.randomUUID();
const defaults:Record<ApparatusKind,Record<string,number|boolean>>={battery:{voltage:1.5},switch:{closed:false},resistor:{ohms:10},ammeter:{range:3},voltmeter:{range:3},barMagnet:{strength:1},uMagnet:{strength:1},straightConductor:{length:200},solenoid:{turns:100},compass:{}};
const terminalKinds=new Set<ApparatusKind>(['battery','switch','resistor','ammeter','voltmeter','straightConductor','solenoid']);
const terminals=(id:string,kind:ApparatusKind):Terminal[]=>terminalKinds.has(kind)?[{id:`${id}:0`,offset:{x:-52,y:0}},{id:`${id}:1`,offset:{x:52,y:0}}]:[];

export const createScene=():ElectromagnetScene=>({version:1,apparatus:[],wires:[],running:true,showFieldLines:true,showCompasses:true});
export function addApparatus(scene:ElectromagnetScene,kind:ApparatusKind,position:Point):ElectromagnetScene{if(!kinds.has(kind)||position.x<0||position.x>4000||position.y<0||position.y>2640)throw new Error('invalid apparatus');const id=ids();const apparatus:Apparatus={id,kind,position:{...position},rotation:0,terminals:terminals(id,kind),params:{...defaults[kind]}};return{...scene,apparatus:[...scene.apparatus,apparatus]};}
export function rotateApparatus(scene:ElectromagnetScene,id:string):ElectromagnetScene{return{...scene,apparatus:scene.apparatus.map(a=>a.id===id?{...a,rotation:((a.rotation+90)%360) as 0|90|180|270}:a)};}
export function validateScene(value:unknown):value is ElectromagnetScene{if(!value||typeof value!=='object')return false;const scene=value as ElectromagnetScene;if(scene.version!==1||!Array.isArray(scene.apparatus)||!Array.isArray(scene.wires)||typeof scene.running!=='boolean'||typeof scene.showFieldLines!=='boolean'||typeof scene.showCompasses!=='boolean'||scene.apparatus.length>120)return false;const apparatusIds=new Set<string>(),terminalIds=new Set<string>();for(const a of scene.apparatus){if(!a||typeof a.id!=='string'||apparatusIds.has(a.id)||!kinds.has(a.kind)||!a.position||!Number.isFinite(a.position.x)||!Number.isFinite(a.position.y)||a.position.x<0||a.position.x>4000||a.position.y<0||a.position.y>2640||![0,90,180,270].includes(a.rotation)||!Array.isArray(a.terminals)||!a.params||typeof a.params!=='object')return false;apparatusIds.add(a.id);for(const t of a.terminals){if(!t||typeof t.id!=='string'||terminalIds.has(t.id)||!t.offset||!Number.isFinite(t.offset.x)||!Number.isFinite(t.offset.y))return false;terminalIds.add(t.id);}}const wireIds=new Set<string>();return scene.wires.every(w=>w&&typeof w.id==='string'&&!wireIds.has(w.id)&&(wireIds.add(w.id),true)&&w.from!==w.to&&terminalIds.has(w.from)&&terminalIds.has(w.to));}
