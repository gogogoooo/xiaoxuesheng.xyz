import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_VIEW,WORLD,MAX_PARTS,findSpace,fitView,viewHeight,zoomView,clampView} from '../lib/canvas.ts';
import {initialScene,validScene,solveCircuit} from '../lib/circuit.ts';

test('120 devices fit without overlaps and reload as valid saved scene',()=>{
  const s=initialScene();
  while(s.parts.length<MAX_PARTS){
    const p=findSpace(s.parts,DEFAULT_VIEW);
    assert.ok(p);
    assert.ok(s.parts.every(a=>Math.abs(a.x-p.x)>=210||Math.abs(a.y-p.y)>=230));
    s.parts.push({id:'p'+s.parts.length,kind:'bulb',...p});
  }
  assert.equal(validScene(JSON.parse(JSON.stringify(s))),true);
  assert.equal(solveCircuit(s).short,false);
  const v=fitView(s.parts);
  for(const p of s.parts){
    assert.ok(p.x-100>=v.x&&p.x+100<=v.x+v.width);
    assert.ok(p.y-110>=v.y&&p.y+120<=v.y+viewHeight(v));
  }
});

test('zoom stays anchored away from world boundaries',()=>{
  const v={x:1000,y:800,width:1000},a={x:1250,y:1000};
  const z=zoomView(v,.5,a);
  assert.equal((a.x-v.x)/v.width,(a.x-z.x)/z.width);
  assert.equal((a.y-v.y)/v.width,(a.y-z.y)/z.width);
});

test('pan and zoom limits stay inside the world',()=>{
  for(const v of [{x:-900,y:9000,width:1},{x:9999,y:-10,width:9000}]){
    const c=clampView(v);
    assert.ok(c.x>=0&&c.y>=0);
    assert.ok(c.x+c.width<=WORLD.width);
    assert.ok(c.y+viewHeight(c)<=WORLD.height);
    assert.ok(c.width>=600);
  }
});

test('new device location follows viewport',()=>{
  const p=findSpace([],{x:2400,y:1400,width:1000});
  assert.ok(p.x>2400&&p.y>1400);
});

test('old saved circuits remain valid; out-of-world coordinates rejected',()=>{
  assert.equal(validScene(initialScene()),true);
  const s=initialScene();
  s.parts[0].x=4100;
  assert.equal(validScene(s),false);
});
