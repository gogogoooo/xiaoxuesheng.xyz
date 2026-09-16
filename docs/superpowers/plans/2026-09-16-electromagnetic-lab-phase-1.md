# Electromagnetic Laboratory Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open electromagnetic workbench with freely placed apparatus, real-time DC results, magnetic fields and editable starter experiments.

**Architecture:** React owns the page shell, PixiJS renders the interactive stage, and pure TypeScript modules own schema, topology, DC solving, field calculations and persistence. The renderer consumes snapshots rather than encoding physical rules.

**Tech Stack:** Vinext, React 19, TypeScript, PixiJS, Node test runner, localStorage and static export.

## Global Constraints

- Modify only the existing personal-site route `/lab/circuits/little-circuit`; preserve every other page.
- No backend, Workers, Cloudflare or DNS changes; persistence is local JSON.
- Phase 1 is linear DC and two-dimensional teaching approximations only.
- Write each behavior test first, observe its failure, then implement the smallest passing change.
- Before final merge run `node tests/circuit.test.mjs`, every electromagnetic test, `node tests/site-content.test.mjs` and `pnpm build`.

---

## File map

- Create `lib/electromagnet/schema.ts`: versioned scene, apparatus, terminals, wires and commands.
- Create `lib/electromagnet/topology.ts`: terminal graph and wire diagnostics.
- Create `lib/electromagnet/dc-solver.ts`: DC nodal solver and meter values.
- Create `lib/electromagnet/field.ts`: superposed fields, compass orientation and field traces.
- Create `lib/electromagnet/storage.ts` and `lib/electromagnet/presets.ts`: JSON handling and starter scenes.
- Create `components/electromagnet/workbench-stage.tsx`, `apparatus-library.tsx`, `inspector.tsx`: Pixi stage and controls.
- Modify `app/lab/circuits/little-circuit/circuit-lab.tsx`, `app/globals.css`, `package.json`, `tests/site-content.test.mjs`.
- Create `tests/electromagnet/schema.test.mjs`, `topology.test.mjs`, `dc-solver.test.mjs`, `field.test.mjs`, `storage.test.mjs`.

### Task 1: Versioned electromagnetic scene schema

**Files:** Create `lib/electromagnet/schema.ts`; test `tests/electromagnet/schema.test.mjs`.

**Produces:** `ElectromagnetScene`, `Apparatus`, `Wire`, `createScene()`, `addApparatus()`, `rotateApparatus()`, `validateScene()`.

- [ ] **Step 1: Write the failing test**

```js
test('new solenoid has defaults and is valid',()=>{
  const scene=addApparatus(createScene(),'solenoid',{x:600,y:400});
  assert.equal(scene.apparatus[0].terminals.length,2);
  assert.equal(scene.apparatus[0].params.turns,100);
  assert.equal(validateScene(scene),true);
});
test('four rotations return to zero',()=>{
  let scene=addApparatus(createScene(),'barMagnet',{x:500,y:500});
  for(let i=0;i<4;i++)scene=rotateApparatus(scene,scene.apparatus[0].id);
  assert.equal(scene.apparatus[0].rotation,0);
});
```

- [ ] **Step 2: Verify red**

Run `node tests/electromagnet/schema.test.mjs`; expect module-not-found for `schema.ts`.

- [ ] **Step 3: Implement minimum interface**

```ts
export type ApparatusKind='battery'|'switch'|'resistor'|'ammeter'|'voltmeter'|'barMagnet'|'uMagnet'|'straightConductor'|'solenoid'|'compass';
export type Point={x:number;y:number};
export type Apparatus={id:string;kind:ApparatusKind;position:Point;rotation:0|90|180|270;terminals:{id:string;offset:Point}[];params:Record<string,number|boolean>};
export type ElectromagnetScene={version:1;apparatus:Apparatus[];wires:{id:string;from:string;to:string}[];running:boolean;showFieldLines:boolean;showCompasses:boolean};
```

Implement per-kind defaults; reject duplicate IDs, unknown kinds, missing terminals, dangling wires and coordinates outside 4000×2640.

- [ ] **Step 4: Verify green and commit**

Run `node tests/electromagnet/schema.test.mjs`; expect 2 passes. Commit `feat: define electromagnetic scene schema`.

### Task 2: Topology and DC solver

**Files:** Create `lib/electromagnet/topology.ts`, `lib/electromagnet/dc-solver.ts`; test `tests/electromagnet/topology.test.mjs`, `tests/electromagnet/dc-solver.test.mjs`.

**Produces:** `buildTopology(scene)` and `solveDc(scene): {branchCurrent: Record<string,number>; nodeVoltage: Record<string,number>; diagnostics: string[]}`.

- [ ] **Step 1: Write failing tests**

```js
test('closed 10-ohm loop calculates 1.5 / 10.27 A',()=>{
  assert.ok(Math.abs(solveDc(closedLoop(10,true)).branchCurrent.resistor-1.5/10.27)<1e-6);
});
test('open switch has no load current',()=>assert.equal(solveDc(closedLoop(10,false)).branchCurrent.resistor,0));
test('shorted battery reports short-circuit',()=>assert.ok(solveDc(shortedBattery()).diagnostics.includes('short-circuit')));
```

- [ ] **Step 2: Verify red**

Run `node tests/electromagnet/topology.test.mjs; node tests/electromagnet/dc-solver.test.mjs`; expect module-not-found errors.

- [ ] **Step 3: Implement solver**

Use union-find for wire-connected terminals. Stamp battery internal resistance 0.25 Ω, closed switch 0.02 Ω, resistor values, ammeter 0.05 Ω and voltmeter 1 MΩ in a pivoted Gaussian-elimination conductance matrix. Isolated components have zero current; battery current above 2 A emits `short-circuit`.

- [ ] **Step 4: Verify green and commit**

Run `node tests/electromagnet/topology.test.mjs; node tests/electromagnet/dc-solver.test.mjs; node tests/circuit.test.mjs`; expect all passes. Commit `feat: solve electromagnetic workbench circuits`.

### Task 3: Magnetic field calculation

**Files:** Create `lib/electromagnet/field.ts`; test `tests/electromagnet/field.test.mjs`.

**Produces:** `fieldAt(scene,currents,point)`, `compassAngle(field)`, `traceFieldLine(scene,currents,seed)`.

- [ ] **Step 1: Write failing tests**

```js
test('bar magnet points opposite directions on opposite sides',()=>{
  assert.ok(fieldAt(sceneWithBarMagnet(),{}, {x:300,y:500}).x<0);
  assert.ok(fieldAt(sceneWithBarMagnet(),{}, {x:700,y:500}).x>0);
});
test('reversed conductor current reverses compass direction',()=>{
  assert.ok(Math.abs(compassAngle(fieldAt(conductor(.3),{},p))-compassAngle(fieldAt(conductor(-.3),{},p)))>2.5);
});
test('more turns create a stronger solenoid field',()=>assert.ok(fieldAt(solenoid(200),{coil:.2},p).magnitude>fieldAt(solenoid(100),{coil:.2},p).magnitude));
```

- [ ] **Step 2: Verify red**

Run `node tests/electromagnet/field.test.mjs`; expect module-not-found for `field.ts`.

- [ ] **Step 3: Implement superposition**

Add softened two-dimensional dipole fields for bar/U magnets, `μ0I/(2πr)` around a straight conductor, and finite-solenoid axial field proportional to turns times current. Clamp radial singularities to 25 pixels. Trace field lines in normalized 12-pixel steps, at most 180 steps.

- [ ] **Step 4: Verify green and commit**

Run `node tests/electromagnet/field.test.mjs`; expect 3 passes. Commit `feat: calculate classroom magnetic fields`.

### Task 4: Local JSON and starter scenes

**Files:** Create `lib/electromagnet/storage.ts`, `lib/electromagnet/presets.ts`; test `tests/electromagnet/storage.test.mjs`.

**Produces:** `saveScene(scene)`, `loadScene(raw)`, `oerstedPreset()`, `solenoidPreset()`.

- [ ] **Step 1: Write failing tests**

```js
test('Oersted preset round-trips through JSON',()=>assert.deepEqual(loadScene(JSON.stringify(oerstedPreset())),oerstedPreset()));
test('invalid version returns null',()=>assert.equal(loadScene('{"version":99}'),null));
```

- [ ] **Step 2: Verify red**

Run `node tests/electromagnet/storage.test.mjs`; expect module-not-found errors.

- [ ] **Step 3: Implement storage**

Use local key `electromagnet-lab-v1` and only accept scenes passing `validateScene`. Build editable Oersted data from battery, switch, straight conductor and compass; build editable solenoid data from battery, switch, variable resistor, solenoid and three compasses.

- [ ] **Step 4: Verify green and commit**

Run `node tests/electromagnet/storage.test.mjs`; expect 2 passes. Commit `feat: save electromagnetic experiments`.

### Task 5: PixiJS workbench integration

**Files:** Create the three `components/electromagnet` components; modify the page, CSS, package manifest and site-content test.

**Consumes:** Scene, solver, field, storage and preset interfaces from Tasks 1–4.

- [ ] **Step 1: Write failing structural test**

```js
test('electromagnetic page exposes apparatus categories and controls',()=>{
  const source=readFileSync('app/lab/circuits/little-circuit/circuit-lab.tsx','utf8');
  for(const label of ['磁体类','电源与开关','测量电表','运行','暂停','保存实验','读取实验','显示磁感线']) assert.match(source,new RegExp(label));
});
```

- [ ] **Step 2: Verify red**

Run `node tests/site-content.test.mjs`; expect the new assertion to fail.

- [ ] **Step 3: Implement the stage**

Install PixiJS with `pnpm add pixi.js`. Render a 4000×2640 world supporting pan, zoom, drag, rotation, selection, deletion and red wire preview snapping within 28 pixels. Add the five named apparatus categories; toolbar actions for undo/redo, clear, JSON save/load, field/compass visibility, run/pause/reset and screenshot; bottom live values for current, voltage, field and diagnostics. Later-phase apparatus must remain unavailable rather than show fake behavior.

- [ ] **Step 4: Verify locally**

Run `pnpm dev`. At the lab route: add and rotate a bar magnet; toggle lines; add a compass; load Oersted and change switch state; export/import JSON; exit to `/lab/circuits`.

- [ ] **Step 5: Verify full build and commit**

Run `node tests/circuit.test.mjs; node tests/electromagnet/schema.test.mjs; node tests/electromagnet/topology.test.mjs; node tests/electromagnet/dc-solver.test.mjs; node tests/electromagnet/field.test.mjs; node tests/electromagnet/storage.test.mjs; node tests/site-content.test.mjs; pnpm build`; expect all pass. Commit `feat: build electromagnetic workbench`.

## Plan self-review

- Covered: open workbench, wire topology, real DC calculation, magnets/conductors/solenoids, compass and field lines, local JSON, two editable presets, static deployment and route regression.
- Deferred: motor force, induction, electrostatics, remaining presets, reports and sharing remain later phases from the approved design.
- Type consistency: Tasks 2–5 consume `ElectromagnetScene`; Task 3 consumes Task 2 current maps; Task 4 accepts only Task 1 validated scenes.
