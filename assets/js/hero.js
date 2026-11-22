// Home-page hero: the background media sit on the faces of a wheel that turns to the next face every few seconds.
// With reduced motion on, faces cross-fade instead of spinning, but still advance and play (Pause button stops them).
// Faces: the 3D brain (brain.js) and the cell-matching clips. Only the front face's video plays; clips load when first shown.
(function () {
  var hero = document.querySelector('.hero-wheel'); if (!hero) return;
  var wheel = hero.querySelector('.wheel'), faces = [].slice.call(wheel.children), n = faces.length;
  var dots = [].slice.call(hero.querySelectorAll('.wheel-dots button')), cap = hero.querySelector('.wheel-cap'), pause = hero.querySelector('.wheel-pause');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var step = 0, timer = null, held = false, paused = false, onScreen = true, hold = null;
  var DWELL = 7000;

  function layout() {
    var w = hero.clientWidth, r = Math.round(w / 2 / Math.tan(Math.PI / n));
    hero.style.setProperty('--r', r + 'px');
    if (!reduce) faces.forEach(function (f, i) { f.style.transform = 'rotateY(' + (i * 360 / n) + 'deg) translateZ(' + r + 'px)'; });
    turn(false);
  }
  function idx() { return ((step % n) + n) % n; }
  function turn(animate) {
    var r = getComputedStyle(hero).getPropertyValue('--r');
    if (!animate) wheel.style.transition = 'none';
    wheel.style.transform = reduce ? 'none' : 'translateZ(-' + r + ') rotateY(' + (-step * 360 / n) + 'deg)';
    if (!animate) { void wheel.offsetWidth; wheel.style.transition = ''; }
    var k = idx();
    faces.forEach(function (f, i) {
      var on = i === k; f.classList.toggle('on', on); f.setAttribute('aria-hidden', String(!on));
      var v = f.querySelector('video');
      if (!v) return;
      if (on) { if (!v.src) { v.src = v.dataset.src; } var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else setTimeout(function () { if (!f.classList.contains('on')) v.pause(); }, 1300);
    });
    dots.forEach(function (d, i) { d.setAttribute('aria-current', String(i === k)); });
    if (cap) cap.textContent = faces[k].dataset.cap || '';
    wheel.classList.add('moving'); clearTimeout(turn.t); turn.t = setTimeout(function () { wheel.classList.remove('moving'); }, 1400);
  }
  function go(i) { var k = idx(), d = ((i - k) % n + n) % n; step += d; turn(true); schedule(); }
  function next() { step += 1; turn(true); schedule(); }
  function schedule() {
    clearTimeout(timer);
    if (paused || held || !onScreen || document.hidden) return;
    timer = setTimeout(next, faces[idx()].dataset.dwell ? +faces[idx()].dataset.dwell : DWELL);
  }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
  if (pause) {
    pause.setAttribute('aria-pressed', String(paused));
    pause.addEventListener('click', function () { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); schedule(); });
  }
  // dragging the brain holds the wheel for a while
  hero.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.brain')) return;
    held = true; clearTimeout(timer); clearTimeout(hold); hold = setTimeout(function () { held = false; schedule(); }, 15000);
  });
  new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; schedule(); }).observe(hero);
  document.addEventListener('visibilitychange', schedule);
  new ResizeObserver(layout).observe(hero);
  layout(); schedule();
})();
