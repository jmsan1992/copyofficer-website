(function () {
  var ENDPOINT = '/api/submit-lead';

  /* ── UTM helpers ── */
  function getUtmsFromUrl() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source:   p.get('utm_source')   || '',
      utm_medium:   p.get('utm_medium')   || '',
      utm_campaign: p.get('utm_campaign') || '',
      utm_content:  p.get('utm_content')  || '',
      utm_term:     p.get('utm_term')     || '',
    };
  }

  function getUtms() {
    var fromUrl = getUtmsFromUrl();
    var hasUrl  = Object.values(fromUrl).some(function (v) { return v !== ''; });
    if (hasUrl) {
      try { sessionStorage.setItem('co_utms', JSON.stringify(fromUrl)); } catch (e) {}
      return fromUrl;
    }
    try {
      var stored = sessionStorage.getItem('co_utms');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '' };
  }

  /* Persist UTMs on page load if present in URL */
  (function persistUtms() {
    var fromUrl = getUtmsFromUrl();
    var hasUrl  = Object.values(fromUrl).some(function (v) { return v !== ''; });
    if (hasUrl) {
      try { sessionStorage.setItem('co_utms', JSON.stringify(fromUrl)); } catch (e) {}
    }
  })();

  /* ── Field helper ── */
  function fieldVal(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  /* ── Click-id helpers (Google Ads gclid / Meta fbclid) ── */
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  /* Copy gclid/fbclid cookies into a form's hidden fields (if present) */
  function setClickIds(form) {
    ['gclid', 'fbclid'].forEach(function (key) {
      var input = form.querySelector('[name="' + key + '"]');
      var val   = getCookie(key);
      if (input && val) input.value = val;
    });
  }

  /* ── Main form handler ── */
  function attachForm(form, entryPage) {
    if (!form) return;

    /* On page load: copy click-id cookies into the hidden fields */
    setClickIds(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Refresh click-ids right before submit (cookies may have been set after load) */
      setClickIds(form);

      var btn       = form.querySelector('[type="submit"]');
      var origText  = btn ? btn.textContent : '';
      var successEl = form.querySelector('.form-success');
      var errorEl   = form.querySelector('.form-error');

      if (!successEl) {
        successEl = document.createElement('p');
        successEl.className = 'form-success';
        successEl.style.cssText = 'color:#3D5240;font-size:15px;margin-top:12px;display:none;';
        successEl.textContent = "We got your message. We'll be in touch within 48 hours.";
        form.appendChild(successEl);
      }
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'form-error';
        errorEl.style.cssText = 'color:#C2492C;font-size:15px;margin-top:12px;display:none;';
        errorEl.textContent = 'Something went wrong. Please try again or email us directly.';
        form.appendChild(errorEl);
      }

      successEl.style.display = 'none';
      errorEl.style.display   = 'none';

      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

      var utms = getUtms();

      var payload = {
        name:         fieldVal(form, 'name'),
        email:        fieldVal(form, 'email'),
        phone:        fieldVal(form, 'phone'),
        company:      fieldVal(form, 'company'),
        website:      fieldVal(form, 'website'),
        message:      fieldVal(form, 'message'),
        source:       utms.utm_source || 'direct',
        entry_page:   entryPage,
        gclid:        fieldVal(form, 'gclid'),
        fbclid:       fieldVal(form, 'fbclid'),
        utm_source:   utms.utm_source,
        utm_medium:   utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content:  utms.utm_content,
        utm_term:     utms.utm_term,
      };

      fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          successEl.style.display = 'block';
          /* Tell GTM the lead form succeeded → fires the Google Ads conversion (real-time) */
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: 'lead_form_success', form_location: entryPage });
          form.reset();
        })
        .catch(function (err) {
          console.error('[CopyOfficer form]', err);
          errorEl.style.display = 'block';
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
        });
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    var path      = window.location.pathname;
    var entryPage = path.indexOf('lp-hispanic') !== -1 ? 'lp_hispanic' : 'homepage';

    document.querySelectorAll('form.contact-form').forEach(function (form) {
      attachForm(form, entryPage);
    });
  });
})();
