import { services } from './services.js';
import { Galaxy } from './galaxy.js';
import { IdeaSpark } from './spark.js';

const universe = document.querySelector('#universe');
const orbit = document.querySelector('#orbit-services');
const panel = document.querySelector('#service-panel');
const picker = document.querySelector('#service-picker');
const pickerToggle = document.querySelector('#picker-toggle');
const list = document.querySelector('#service-list');
const motionToggle = document.querySelector('#motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 760px)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const galaxy = new Galaxy(document.querySelector('#galaxy'));
const spark = new IdeaSpark(document.querySelector('#idea-spark'));
const nodes = [];
const listButtons = [];
const nodeSizes = [];
const nodePositions = [];
const viewport = { width: universe.clientWidth, height: universe.clientHeight };
const pointer = { x: 0, y: 0, active: false };
let selected = -1;
let paused = reducedMotion.matches;
let orbitHover = false;
let orbitFocus = false;
let lastTrigger = null;
let closeTimeout;
let animationFrame;
let time = 0;
let orbitTime = 0;
let previousTimestamp = 0;
let lastDraw = 0;
let needsDraw = true;
let settlingFrames = 0;
let geometry;
let drawDelta = 0;
let nearService = false;

services.forEach((service, index) => {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'service-node';
  node.dataset.service = service.id;
  node.style.setProperty('--service-color', service.color);
  node.setAttribute('aria-label', service.name);
  node.setAttribute('aria-controls', 'service-panel');
  node.setAttribute('aria-expanded', 'false');
  node.innerHTML = `<span class="node-symbol" aria-hidden="true">${service.symbol}</span><span class="node-label">${service.short}</span><span class="node-plus" aria-hidden="true">+</span>`;
  node.addEventListener('click', () => openService(index, node));
  node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') orbitHover = true; });
  node.addEventListener('pointerleave', () => { orbitHover = false; });
  node.addEventListener('focus', () => { orbitFocus = true; });
  node.addEventListener('blur', () => { orbitFocus = false; });
  orbit.append(node);
  nodes.push(node);

  const button = document.createElement('button');
  button.type = 'button';
  button.style.setProperty('--service-color', service.color);
  button.setAttribute('aria-controls', 'service-panel');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `<span class="list-symbol" aria-hidden="true">${service.symbol}</span><span>${service.name}</span><span class="list-arrow" aria-hidden="true">↗</span>`;
  button.addEventListener('click', () => { setPicker(false); openService(index, pickerToggle); });
  list.append(button);
  listButtons.push(button);
});

function targetGeometry() {
  const w = viewport.width, h = viewport.height;
  if (mobile.matches) {
    return { x: w * .5, y: h * .41, radius: Math.min(w * .56, h * .28), rx: w * .37, ry: h * .205 };
  }
  return {
    x: w * .58,
    y: h * .48,
    radius: Math.min(w * .32, h * .42),
    rx: Math.min(w * .30, h * .44),
    ry: Math.min(h * .29, w * .24),
  };
}

function measureLayout() {
  viewport.width = universe.clientWidth;
  viewport.height = universe.clientHeight;
  nodes.forEach((node, i) => { nodeSizes[i] = { width: node.offsetWidth, height: node.offsetHeight }; });
}

function setPicker(open, focusFirst = false) {
  list.hidden = !open;
  pickerToggle.setAttribute('aria-expanded', String(open));
  if (focusFirst && open) (listButtons[selected] || listButtons[0]).focus();
}

function requestDraw() {
  needsDraw = true;
  settlingFrames = reducedMotion.matches ? 1 : 45;
  if (!animationFrame && !document.hidden) animationFrame = requestAnimationFrame(frame);
}

function openService(index, trigger) {
  clearTimeout(closeTimeout);
  selected = (index + services.length) % services.length;
  if (trigger) lastTrigger = trigger;
  const service = services[selected];
  if (!paused && !reducedMotion.matches && nodePositions[selected]) {
    spark.connect(nodePositions[selected], geometry, service.color, performance.now() / 1000);
  }
  resetPointer();
  universe.style.setProperty('--accent', service.color);
  document.querySelector('#panel-index').textContent = `${String(selected + 1).padStart(2, '0')} / 07`;
  document.querySelector('#panel-kicker').textContent = service.kicker;
  document.querySelector('#panel-title').textContent = service.title;
  document.querySelector('#panel-description').textContent = service.description;
  document.querySelector('#panel-symbol').textContent = service.symbol;
  document.querySelector('#panel-position').textContent = service.name.toUpperCase();
  const capabilities = document.querySelector('#panel-capabilities');
  capabilities.replaceChildren(...service.capabilities.map(text => { const item = document.createElement('li'); item.textContent = text; return item; }));
  document.querySelector('#panel-cta').href = `mailto:info@luscore.com?subject=${encodeURIComponent(`Let’s build something — ${service.name}`)}`;
  panel.hidden = false;
  panel.inert = false;
  universe.classList.add('panel-open');
  // Force the initial state to be painted before the entry transition.
  void panel.offsetWidth;
  universe.classList.add('panel-visible');
  document.querySelector('#panel-body').scrollTop = 0;
  nodes.forEach((node, i) => node.setAttribute('aria-expanded', String(i === selected)));
  listButtons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === selected)));
  orbit.inert = mobile.matches;
  galaxy.targetAccent = service.rgb;
  document.querySelector('#announcement').textContent = `${service.name} details opened.`;
  document.querySelector('#panel-title').focus({ preventScroll: true });
  requestDraw();
}

function closePanel() {
  if (selected < 0) return;
  selected = -1;
  universe.classList.remove('panel-visible', 'panel-open');
  panel.inert = true;
  orbit.inert = false;
  nodes.forEach(node => node.setAttribute('aria-expanded', 'false'));
  listButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
  galaxy.targetAccent = [.66, .42, 1];
  lastTrigger?.focus({ preventScroll: true });
  // Restoring focus after reading details must not hold the service orbit still.
  // A fresh hover or keyboard focus will pause it again for selection.
  orbitFocus = false;
  orbitHover = false;
  resetPointer();
  closeTimeout = setTimeout(() => { panel.hidden = true; }, reducedMotion.matches ? 0 : 280);
  document.querySelector('#announcement').textContent = 'Service details closed.';
  requestDraw();
}

function updateMotion() {
  universe.classList.toggle('paused', paused);
  motionToggle.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
  motionToggle.setAttribute('aria-pressed', String(paused));
  document.querySelector('#motion-label').textContent = paused ? 'A MOMENT OF STILLNESS' : 'UNIVERSE IN MOTION';
  motionToggle.innerHTML = paused
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>'
    : '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>';
  if (paused) {
    resetPointer();
    galaxy.pulse[2] = -10;
  }
  spark.setEnabled(!paused && !reducedMotion.matches && finePointer.matches && !mobile.matches);
  previousTimestamp = 0;
  requestDraw();
}

function resetPointer() {
  pointer.active = false;
  galaxy.targetActivity = 0;
  spark.leave();
  universe.classList.remove('spark-active');
  nearService = false;
  nodes.forEach(node => node.classList.remove('spark-near'));
}

function frame(timestamp) {
  animationFrame = null;
  if (document.hidden) return;
  const dt = previousTimestamp ? Math.min((timestamp - previousTimestamp) / 1000, .05) : 0;
  previousTimestamp = timestamp;
  if (!paused) {
    time += dt;
    if (!orbitHover && !orbitFocus && !nearService && list.hidden) orbitTime += dt * 2.8;
  }
  // The galaxy rotates around an anchored core; service orbits pause for selection.
  nearService = false;
  nodes.forEach((node, i) => {
    const service = services[i];
    const angle = service.angle + orbitTime * service.speed;
    let x = geometry.x + Math.cos(angle) * geometry.rx * service.radius;
    let y = geometry.y + Math.sin(angle) * geometry.ry * service.radius;
    const { width: w, height: h } = nodeSizes[i];
    x = Math.max(w / 2 + 15, Math.min(viewport.width - w / 2 - 15, x));
    y = Math.max(mobile.matches ? 160 : 175, Math.min(viewport.height - (mobile.matches ? 233 : 220), y));
    node.style.transform = `translate3d(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px, 0)`;
    nodePositions[i] = { x, y };
    const nearby = pointer.active && Math.hypot(pointer.x - x, pointer.y - y) < 85;
    node.classList.toggle('spark-near', nearby);
    nearService ||= nearby;
  });
  spark.render(timestamp / 1000);
  drawDelta += dt;
  const drawInterval = mobile.matches ? 1000 / 30 : 1000 / 60;
  if (timestamp - lastDraw >= drawInterval - .75 || needsDraw) {
    galaxy.render(time, geometry, { immediate: reducedMotion.matches, dt: drawDelta || 1 / 60 });
    drawDelta = 0;
    lastDraw = timestamp;
    needsDraw = false;
    settlingFrames--;
  }
  if (!paused || settlingFrames > 0) animationFrame = requestAnimationFrame(frame);
}

pickerToggle.addEventListener('click', () => setPicker(list.hidden));
pickerToggle.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setPicker(true, true); }
});
list.addEventListener('keydown', event => {
  const current = listButtons.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    let next = event.key === 'ArrowDown' ? current + 1 : current - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = services.length - 1;
    listButtons[(next + services.length) % services.length].focus();
  }
});
document.addEventListener('click', event => {
  const insidePicker = picker.contains(event.target);
  if (!insidePicker) setPicker(false);
  // Let panel controls and service selectors handle their own clicks.
  // In particular, the click that opens a service must not also close it.
  if (selected >= 0 && !insidePicker && !panel.contains(event.target) && !event.target.closest('.service-node')) {
    closePanel();
  }
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!list.hidden) { setPicker(false); pickerToggle.focus(); }
  else closePanel();
});
document.querySelector('.close-panel').addEventListener('click', closePanel);
document.querySelector('#previous-service').addEventListener('click', () => openService(selected - 1));
document.querySelector('#next-service').addEventListener('click', () => openService(selected + 1));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); closePanel(); setPicker(false); });
motionToggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; updateMotion(); });
finePointer.addEventListener('change', updateMotion);
window.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' || !spark.enabled) return;
  // Restore the normal cursor and remove the trail over reading/navigation UI.
  if (event.target.closest('.service-panel, .service-picker, .header, .footer')) {
    resetPointer();
    return;
  }
  const x = event.clientX / viewport.width;
  const y = event.clientY / viewport.height;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  spark.move(event.clientX, event.clientY, performance.now() / 1000);
  universe.classList.toggle('spark-active', spark.active);
  galaxy.targetCursor = [x, 1 - y];
  galaxy.targetActivity = 1;
}, { passive: true });
universe.addEventListener('pointerleave', resetPointer);
window.addEventListener('blur', () => { resetPointer(); orbitHover = false; });
document.addEventListener('keydown', event => { if (event.key === 'Tab') resetPointer(); });
universe.addEventListener('pointerdown', event => {
  if (paused || reducedMotion.matches || !event.isPrimary || event.button !== 0) return;
  if (event.target.closest('button, a, .service-panel, .service-picker, .header, .footer')) return;
  if (Math.hypot(event.clientX - geometry.x, event.clientY - geometry.y) < geometry.radius * .22) {
    galaxy.pulse = [geometry.x / viewport.width, 1 - geometry.y / viewport.height, time];
  }
}, { passive: true });
window.addEventListener('resize', () => {
  measureLayout();
  galaxy.resize();
  spark.resize();
  resetPointer();
  spark.setEnabled(!paused && !reducedMotion.matches && finePointer.matches && !mobile.matches);
  orbit.inert = mobile.matches && selected >= 0;
  geometry = targetGeometry();
  requestDraw();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(animationFrame); animationFrame = null; resetPointer(); spark.clear(); }
  else { previousTimestamp = 0; requestDraw(); }
});
document.querySelector('#year').textContent = new Date().getFullYear();
measureLayout();
document.fonts.ready.then(() => { measureLayout(); requestDraw(); });
geometry = targetGeometry();
updateMotion();
universe.classList.add('is-entering');
setTimeout(() => universe.classList.remove('is-entering'), 800);
