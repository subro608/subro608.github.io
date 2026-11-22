// Theme toggle (remembers the choice) and the phone menu. The page works without this file.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  var menu = document.querySelector('.menu-toggle'), nav = document.getElementById('site-nav');
  if (menu && nav) menu.addEventListener('click', function () {
    var open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open));
  });
})();
