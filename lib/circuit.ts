export type Kind = 'battery'|'bulb'|'switch'|'motor';
export type Part = {id:string;kind:Kind;x:number;y:number;closed?:boolean};
export type Scene = {parts:Part[];wires:{id:string;a:string;b:string}[]};
export function initialScene():Scene{return {parts:[{id:'battery',kind:'battery',x:250,y:190},{id:'bulb',kind:'bulb',x:690,y:190},{id:'switch',kind:'switch',x:470,y:445,closed:false}],wires:[{id:'w1',a:'battery:1',b:'bulb:0'},{id:'w2',a:'bulb:1',b:'switch:1'},{id:'w3',a:'switch:0',b:'battery:0'}]};}
export function validScene(s:unknown):s is Scene {if(!s||typeof s!=='object')return false;const a=s as Scene;if(!Array.isArray(a.parts)||!Array.isArray(a.wires)||a.parts.length>120||a.wires.length>600)return false;const ids=new Set<string>();for(const p of a.parts){if(!p||typeof p.id!=='string'||p.id.includes(':')||ids.has(p.id)||!['battery','bulb','switch','motor'].includes(p.kind)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<100||p.x>3900||p.y<110||p.y>2520||(p.closed!==undefined&&typeof p.closed!=='boolean'))return false;ids.add(p.id);}const terminals=new Set(a.parts.flatMap(p=>[p.id+':0',p.id+':1']));return a.wires.every(w=>w&&typeof w.id==='string'&&terminals.has(w.a)&&terminals.has(w.b));}
// DC nodal model. Batteries include internal resistance; lamps use a fixed
// resistance approximation, not a temperature-dependent filament model.
export function solveCircuit(scene:Scene):{currents:Record<string,number>;short:boolean}{
 const parent=new Map<string,string>();for(const p of scene.parts){parent.set(p.id+':0',p.id+':0');parent.set(p.id+':1',p.id+':1');}
 function root(k:string):string{const p=parent.get(k);if(!p||p===k)return k;const r=root(p);parent.set(k,r);return r;}
 for(const w of scene.wires)if(parent.has(w.a)&&parent.has(w.b))parent.set(root(w.a),root(w.b));
 const nodes=[...new Set([...parent.keys()].map(root))],n=nodes.length;if(!n)return{currents:{},short:false};
 const index=new Map(nodes.map((v,i)=>[v,i]));const A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1e-9:0));const rhs=Array(n).fill(0);
 const branches=scene.parts.filter(p=>p.kind!=='switch'||p.closed).map(p=>({p,a:index.get(root(p.id+':0'))!,b:index.get(root(p.id+':1'))!,r:p.kind==='battery'?.25:p.kind==='switch'?.02:p.kind==='bulb'?8:12,e:p.kind==='battery'?1.5:0}));
 for(const v of branches){if(v.a===v.b)continue;const g=1/v.r;A[v.a][v.a]+=g;A[v.b][v.b]+=g;A[v.a][v.b]-=g;A[v.b][v.a]-=g;rhs[v.a]-=v.e*g;rhs[v.b]+=v.e*g;}
 for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[pivot][k]))pivot=i;[A[k],A[pivot]]=[A[pivot],A[k]];[rhs[k],rhs[pivot]]=[rhs[pivot],rhs[k]];const d=A[k][k];if(Math.abs(d)<1e-14)continue;for(let j=k;j<n;j++)A[k][j]/=d;rhs[k]/=d;for(let i=0;i<n;i++){if(i===k)continue;const f=A[i][k];for(let j=k;j<n;j++)A[i][j]-=f*A[k][j];rhs[i]-=f*rhs[k];}}
 const currents:Record<string,number>={};let short=false;for(const v of branches){const i=(rhs[v.a]-rhs[v.b]+v.e)/v.r;currents[v.p.id]=Math.abs(i)<1e-6?0:i;if(v.p.kind==='battery'&&Math.abs(i)>2)short=true;}return {currents,short};
}
