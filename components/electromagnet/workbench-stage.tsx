'use client';
import {useMemo} from 'react';
import {fieldAt,compassAngle} from '@/lib/electromagnet/field';
import type {ElectromagnetScene} from '@/lib/electromagnet/schema';

export function WorkbenchStage({scene}:{scene:ElectromagnetScene}){
 const compasses=useMemo(()=>scene.apparatus.filter(a=>a.kind==='compass').map(a=>({a,angle:compassAngle(fieldAt(scene,{},a.position))})),[scene]);
 return <div className="electromagnet-stage" aria-label="电磁自由实验台">{compasses.map(({a,angle})=><span key={a.id} className="compass" style={{left:a.position.x/10,top:a.position.y/10,transform:`rotate(${angle}rad)`}}>🧭</span>)}<p>拖入磁铁、螺线管或小磁针，观察实时磁场变化。</p></div>;
}
