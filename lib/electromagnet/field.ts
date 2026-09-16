import type {ElectromagnetScene,Point} from './schema';
export type Field={x:number;y:number;magnitude:number};
export const compassAngle=(f:Field)=>Math.atan2(f.y,f.x);
export function fieldAt(scene:ElectromagnetScene,currents:Record<string,number>,point:Point):Field{let x=0,y=0;for(const a of scene.apparatus){const dx=point.x-a.position.x,dy=point.y-a.position.y,r2=Math.max(625,dx*dx+dy*dy);if(a.kind==='barMagnet'||a.kind==='uMagnet'){const sign=dx>=0?1:-1;x+=sign*Number(a.params.strength??1)/r2;}if(a.kind==='straightConductor'){const i=currents[a.id]??0;x+=-dy*i/r2;y+=dx*i/r2;}if(a.kind==='solenoid'){const i=currents[a.id]??0,turns=Number(a.params.turns??100),inside=Math.abs(dx)<120&&Math.abs(dy)<75;x+=(inside?1:.15)*i*turns/100;}}return{x,y,magnitude:Math.hypot(x,y)};}
