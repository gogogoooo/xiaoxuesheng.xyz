import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,addApparatus} from '../../lib/electromagnet/schema.ts';
import {solveDc} from '../../lib/electromagnet/dc-solver.ts';
const add=(s,k,x)=>addApparatus(s,k,{x,y:400});
function loop(closed=true){let s=createScene();s=add(s,'battery',200);s=add(s,'switch',450);s=add(s,'resistor',700);s.apparatus[1].params.closed=closed;s.wires=[{id:'a',from:s.apparatus[0].terminals[1].id,to:s.apparatus[1].terminals[0].id},{id:'b',from:s.apparatus[1].terminals[1].id,to:s.apparatus[2].terminals[0].id},{id:'c',from:s.apparatus[2].terminals[1].id,to:s.apparatus[0].terminals[0].id}];return s;}
test('closed resistor loop calculates current',()=>{const s=loop();assert.ok(Math.abs(solveDc(s).branchCurrent[s.apparatus[2].id]-1.5/10.27)<1e-6);});
test('open switch stops load current',()=>{const s=loop(false);assert.equal(solveDc(s).branchCurrent[s.apparatus[2].id],0);});
test('battery terminals joined directly report a short circuit',()=>{let s=createScene();s=add(s,'battery',300);s.wires=[{id:'short',from:s.apparatus[0].terminals[0].id,to:s.apparatus[0].terminals[1].id}];assert.ok(solveDc(s).diagnostics.includes('short-circuit'));});
