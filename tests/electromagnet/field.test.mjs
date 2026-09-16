import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,addApparatus} from '../../lib/electromagnet/schema.ts';
import {fieldAt,compassAngle} from '../../lib/electromagnet/field.ts';
const add=(s,k,x=500)=>addApparatus(s,k,{x,y:500});
test('bar magnet has opposite field direction on opposite sides',()=>{const s=add(createScene(),'barMagnet');assert.ok(fieldAt(s,{}, {x:300,y:500}).x<0);assert.ok(fieldAt(s,{}, {x:700,y:500}).x>0);});
test('reversing straight conductor current reverses compass direction',()=>{const s=add(createScene(),'straightConductor');assert.ok(Math.abs(compassAngle(fieldAt(s,{[s.apparatus[0].id]:.3},{x:500,y:400}))-compassAngle(fieldAt(s,{[s.apparatus[0].id]:-.3},{x:500,y:400})))>2.5);});
test('more solenoid turns creates a stronger field',()=>{let a=add(createScene(),'solenoid'),b=add(createScene(),'solenoid');b.apparatus[0].params.turns=200;assert.ok(fieldAt(b,{[b.apparatus[0].id]:.2},{x:500,y:500}).magnitude>fieldAt(a,{[a.apparatus[0].id]:.2},{x:500,y:500}).magnitude);});
