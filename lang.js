/* Language choice.
   - Visitors arriving from outside on the main address (the Italian home page) are sent to the page in
     their browser language: EN, DE or FR. Other browser languages fall back to English.
   - Picking a language in the header is remembered, so the choice wins over the browser language.
     The IT button also carries ?lang=it, so Italian works even where the browser can't remember. */
(function () {
  var KEY = 'aibility-lang', SUPPORTED = ['it', 'en', 'de', 'fr'];
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.lang a[lang]');
    if (a) set(a.getAttribute('lang'));
  });

  var html = document.documentElement;
  var asked = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
  if (SUPPORTED.indexOf(asked) >= 0) {
    set(asked);
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
    return;
  }

  if (!html.hasAttribute('data-autolang')) return;
  if (/bot|crawl|spider|slurp|preview|lighthouse/i.test(navigator.userAgent)) return; // search engines index every language
  var ref = document.referrer;
  if (ref && ref.indexOf(location.protocol + '//' + location.host + '/') === 0) return; // moving around the site: leave it

  var want = get();
  if (SUPPORTED.indexOf(want) < 0) {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    want = 'en';
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).slice(0, 2).toLowerCase();
      if (SUPPORTED.indexOf(l) >= 0) { want = l; break; }
    }
  }
  if (want !== 'it') location.replace(want + '/' + location.search + location.hash);
})();
