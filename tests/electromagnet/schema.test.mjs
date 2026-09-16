import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,addApparatus,rotateApparatus,validateScene} from '../../lib/electromagnet/schema.ts';

test('new solenoid has terminals, defaults and a valid scene',()=>{
  const scene=addApparatus(createScene(),'solenoid',{x:600,y:400});
  assert.equal(scene.apparatus[0].terminals.length,2);
  assert.equal(scene.apparatus[0].params.turns,100);
  assert.equal(validateScene(scene),true);
});

test('four rotations return an apparatus to zero degrees',()=>{
  let scene=addApparatus(createScene(),'barMagnet',{x:500,y:500});
  for(let i=0;i<4;i++)scene=rotateApparatus(scene,scene.apparatus[0].id);
  assert.equal(scene.apparatus[0].rotation,0);
});

test('invalid positions and dangling wires are rejected',()=>{
  const scene=addApparatus(createScene(),'battery',{x:500,y:500});
  assert.equal(validateScene({...scene,apparatus:[{...scene.apparatus[0],position:{x:4001,y:500}}]}),false);
  assert.equal(validateScene({...scene,wires:[{id:'bad',from:'missing:0',to:'missing:1'}]}),false);
});
