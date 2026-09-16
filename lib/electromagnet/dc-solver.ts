import type {ElectromagnetScene} from './schema';

export function solveDc(scene:ElectromagnetScene){
 const parent=new Map<string,string>();for(const p of scene.apparatus)for(const t of p.terminals)parent.set(t.id,t.id);
 const root=(k:string):string=>{const p=parent.get(k);if(!p||p===k)return k;const r=root(p);parent.set(k,r);return r;};
 for(const w of scene.wires)if(parent.has(w.from)&&parent.has(w.to))parent.set(root(w.from),root(w.to));
 const nodes=[...new Set([...parent.keys()].map(root))],index=new Map(nodes.map((v,i)=>[v,i])),n=nodes.length,A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1e-9:0)),b=Array(n).fill(0);
 const branches=scene.apparatus.filter(p=>p.terminals.length===2&&(p.kind!=='switch'||p.params.closed)).map(p=>({p,a:index.get(root(p.terminals[0].id))!,z:index.get(root(p.terminals[1].id))!,r:p.kind==='battery'?.25:p.kind==='switch'?.02:Number(p.params.ohms??12),e:p.kind==='battery'?Number(p.params.voltage??1.5):0}));
 for(const q of branches){if(q.a===q.z)continue;const g=1/q.r;A[q.a][q.a]+=g;A[q.z][q.z]+=g;A[q.a][q.z]-=g;A[q.z][q.a]-=g;b[q.a]-=q.e*g;b[q.z]+=q.e*g;}
 for(let k=0;k<n;k++){const d=A[k][k];if(Math.abs(d)<1e-14)continue;for(let j=k;j<n;j++)A[k][j]/=d;b[k]/=d;for(let i=0;i<n;i++)if(i!==k){const f=A[i][k];for(let j=k;j<n;j++)A[i][j]-=f*A[k][j];b[i]-=f*b[k];}}
 const branchCurrent:Record<string,number>={};for(const q of branches){const current=(b[q.a]-b[q.z]+q.e)/q.r;branchCurrent[q.p.id]=Math.abs(current)<1e-8?0:current;}
 return {branchCurrent,nodeVoltage:Object.fromEntries(nodes.map((v,i)=>[v,b[i]])),diagnostics:branches.some(q=>q.p.kind==='battery'&&Math.abs(branchCurrent[q.p.id])>2)?['short-circuit']:[]};
}
