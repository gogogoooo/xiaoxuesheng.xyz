import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../public/games/quicksand-simulator/', import.meta.url);
// Execute the real classic scripts with DOM/Canvas adapters. Browser visual QA is separate.
function boot() {
  let frame,
    drawCalls = 0;
  const context2d = new Proxy(
    {},
    {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => {
          if (['lineTo', 'moveTo', 'fillRect', 'ellipse'].includes(key)) {
            assert.ok(
              args.filter((v) => typeof v === 'number').every(Number.isFinite),
              `Invalid ${key} coordinates`,
            );
            drawCalls++;
          }
        };
      },
    },
  );
  function element(id, dataset = {}) {
    return {
      id,
      dataset,
      style: {},
      value: '',
      textContent: '',
      hidden: id === 'help-panel',
      attrs: {},
      handlers: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) {
        this.handlers[type] = fn;
      },
      setAttribute(key, value) {
        this.attrs[key] = value;
      },
      getContext() {
        return context2d;
      },
      getBoundingClientRect() {
        return { width: 900, height: 730, left: 0, top: 0 };
      },
      focus() {},
      setPointerCapture() {},
      matches() {
        return false;
      },
    };
  }
  const html = fs.readFileSync(new URL('index.html', base), 'utf8');
  const elements = Object.fromEntries(
    [...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, element(id)]),
  );
  const groups = {
    '[data-tool]': ['paint', 'erase', 'orbit'].map((tool) =>
      element(tool, { tool }),
    ),
    '[data-material]': ['sand', 'chocolate', 'ketchup'].map((material) =>
      element(material, { material }),
    ),
    '[data-move]': ['w', 'a', 's', 'd'].map((move) => element(move, { move })),
  };
  const docHandlers = {};
  const sandbox = {
    document: {
      getElementById: (id) => elements[id],
      createElement: () => element('cache'),
      querySelectorAll: (q) => groups[q],
      addEventListener: (e, fn) => (docHandlers[e] = fn),
    },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    ResizeObserver: class {
      observe() {}
    },
    performance: { now: () => 0 },
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame: (fn) => (frame = fn),
    addEventListener() {},
  };
  sandbox.window = sandbox;
  const scope = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(new URL('physics.js', base), 'utf8'), scope);
  vm.runInContext(fs.readFileSync(new URL('game.js', base), 'utf8'), scope);
  let time = 0;
  return {
    elements,
    groups,
    docHandlers,
    tick(n = 1) {
      for (let i = 0; i < n; i++) {
        time += 1000 / 60;
        frame(time);
      }
    },
    draws: () => drawCalls,
    event(id, type, options = {}) {
      elements[id].handlers[type]({
        preventDefault() {},
        pointerId: 1,
        button: 0,
        target: elements[id],
        ...options,
      });
    },
  };
}

test('classic scripts initialize, render finite geometry, place clones and reset through UI events', () => {
  const app = boot();
  app.tick(10);
  assert.ok(app.draws() > 100);
  app.event('clone', 'click');
  app.event('world', 'pointerdown', { clientX: 450, clientY: 416 });
  app.event('world', 'pointerup');
  app.tick(10);
  assert.equal(app.elements['clone-count'].textContent, 1);
  app.event('reset', 'click');
  app.tick(10);
  assert.equal(app.elements['clone-count'].textContent, 0);
  assert.equal(app.elements.coverage.textContent, '0%');
  app.groups['[data-tool]'][0].handlers.click();
  app.event('world', 'pointerdown', { clientX: 450, clientY: 416 });
  app.event('world', 'pointerup');
  app.tick(10);
  assert.notEqual(app.elements.coverage.textContent, '0%');
  app.event('world', 'pointerdown', { clientX: 450, clientY: 416, button: 2 });
  app.event('world', 'pointerup');
  app.tick(10);
  assert.equal(app.elements.coverage.textContent, '0%');
});

test('camera, help and pause UI remain operable', () => {
  const app = boot();
  app.tick();
  app.event('world', 'wheel', { deltaY: -100 });
  assert.equal(app.elements['zoom-value'].textContent, '111%');
  app.event('view-reset', 'click');
  assert.equal(app.elements['zoom-value'].textContent, '100%');
  app.groups['[data-tool]'][2].handlers.click();
  app.event('world', 'pointerdown', { clientX: 450, clientY: 416 });
  app.event('world', 'pointermove', { clientX: 600, clientY: 460 });
  app.event('world', 'pointerup');
  app.tick();
  app.event('help', 'click');
  assert.equal(app.elements['help-panel'].hidden, false);
  assert.equal(app.elements.pause.attrs['aria-pressed'], true);
  app.event('help-close', 'click');
  assert.equal(app.elements['help-panel'].hidden, true);
  assert.equal(app.elements.pause.attrs['aria-pressed'], false);
});

test('offline entry uses only existing relative classic scripts and styles', () => {
  const html = fs.readFileSync(new URL('index.html', base), 'utf8');
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (m) => m[1],
  );
  for (const ref of references) {
    assert.ok(!/^(?:https?:|\/\/|\/)/.test(ref));
    assert.ok(fs.existsSync(new URL(ref, base)));
  }
  assert.ok(!html.includes('type="module"'));
});
