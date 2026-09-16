export const WORLD = {width:4000,height:2640};
export const MAX_PARTS = 120;
export const MAX_WIRES = 600;
export type View = {x:number;y:number;width:number};
export const DEFAULT_VIEW:View={x:0,y:0,width:1300};
export const viewHeight=(v:View)=>v.width*.66;
export function clampView(v:View):View{const width=Math.max(600,Math.min(WORLD.width,v.width));return{width,x:Math.max(0,Math.min(WORLD.width-width,v.x)),y:Math.max(0,Math.min(WORLD.height-width*.66,v.y))};}
export function zoomView(v:View,factor:number,anchor={x:v.x+v.width/2,y:v.y+viewHeight(v)/2}):View{const width=Math.max(600,Math.min(WORLD.width,v.width*factor)),ratio=width/v.width;return clampView({width,x:anchor.x-(anchor.x-v.x)*ratio,y:anchor.y-(anchor.y-v.y)*ratio});}
export function fitView(parts:{x:number;y:number}[]):View{if(!parts.length)return DEFAULT_VIEW;const left=Math.min(...parts.map(p=>p.x))-150,top=Math.min(...parts.map(p=>p.y))-160,right=Math.max(...parts.map(p=>p.x))+150,bottom=Math.max(...parts.map(p=>p.y))+170;const width=Math.max(1000,right-left,(bottom-top)/.66);return clampView({width,x:(left+right-width)/2,y:(top+bottom-width*.66)/2});}
export function findSpace(parts:{x:number;y:number}[],view:View){const center={x:view.x+view.width/2,y:view.y+viewHeight(view)/2};const spots:{x:number;y:number}[]=[];for(let y=160;y<=WORLD.height-140;y+=250)for(let x=150;x<=WORLD.width-130;x+=230)if(!parts.some(p=>Math.abs(p.x-x)<210&&Math.abs(p.y-y)<230))spots.push({x,y});spots.sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y));return spots[0]??null;}
