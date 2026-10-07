// COOKIE CONSENT BANNER (Google Consent Mode v2, kein externer Anbieter)
(function () {
  var CONSENT_KEY = 'jsb_consent';

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function clearConsent() {
    try { localStorage.removeItem(CONSENT_KEY); } catch (e) {}
  }

  function updateGtagConsent(granted) {
    if (typeof gtag !== 'function') return;
    var state = granted ? 'granted' : 'denied';
    gtag('consent', 'update', {
      'ad_storage': state,
      'ad_user_data': state,
      'ad_personalization': state,
      'analytics_storage': state
    });
  }

  function buildBanner() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML =
      '<p class="cookie-banner-text">' +
        'Wir verwenden Cookies von Google Ads, um den Erfolg unserer Werbung zu messen. ' +
        'Mehr dazu in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.' +
      '</p>' +
      '<div class="cookie-banner-actions">' +
        '<button type="button" class="cookie-btn" id="cookieReject">Ablehnen</button>' +
        '<button type="button" class="cookie-btn" id="cookieAccept">Akzeptieren</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('#cookieAccept').addEventListener('click', function () {
      setConsent('granted');
      updateGtagConsent(true);
      hideBanner();
    });
    banner.querySelector('#cookieReject').addEventListener('click', function () {
      setConsent('denied');
      hideBanner();
    });

    return banner;
  }

  function showBanner() {
    var banner = document.getElementById('cookieBanner') || buildBanner();
    requestAnimationFrame(function () {
      banner.classList.add('open');
    });
  }

  function hideBanner() {
    var banner = document.getElementById('cookieBanner');
    if (banner) banner.classList.remove('open');
  }

  function init() {
    if (!getConsent()) showBanner();

    document.addEventListener('click', function (e) {
      var link = e.target.closest('.cookie-settings-link');
      if (!link) return;
      e.preventDefault();
      clearConsent();
      showBanner();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
