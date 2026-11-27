/* queueArc – Prototyp: Sprachumschalter, Sound, Kontaktformular, Kauf-Ablauf (ohne echte Zahlung/Mail) */
(function () {
  'use strict';

  var LANG_KEY = 'queuearc-lang';
  var SOUND_KEY = 'queuearc-sound';
  var SOUND_FILE = 'assets/audio/soundmarke-platzhalter.wav';
  var SOUND_MS = 900;

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* Speicher nicht verfügbar */ }
  }

  /* ---------- Sprache ---------- */
  var lang = safeGet(LANG_KEY) === 'en' ? 'en' : 'de';

  function applyLang(newLang) {
    lang = newLang;
    document.documentElement.setAttribute('lang', lang);
    var buttons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-lang') === lang ? 'true' : 'false');
    }
    var items = document.querySelectorAll('[data-de][data-en]');
    for (var j = 0; j < items.length; j++) {
      var el = items[j];
      var value = el.getAttribute('data-' + lang);
      var attr = el.getAttribute('data-attr');
      if (attr) {
        el.setAttribute(attr, value);
      } else if (el.tagName === 'TITLE') {
        document.title = value;
      }
    }
  }

  function bi(de, en) {
    return '<span class="de">' + de + '</span><span class="en">' + en + '</span>';
  }

  /* ---------- Sound (nur nach Interaktion, < 1 s) ---------- */
  var soundOn = safeGet(SOUND_KEY) !== 'off';
  var audio = null;

  function playSound() {
    if (!soundOn) { return; }
    try {
      if (!audio) {
        audio = new Audio(SOUND_FILE);
        audio.volume = 0.6;
      }
      audio.currentTime = 0;
      var p = audio.play();
      if (p && p.catch) { p.catch(function () { /* Wiedergabe blockiert */ }); }
    } catch (e) { /* ignorieren */ }
  }

  function applySound() {
    var toggle = document.getElementById('sound-toggle');
    if (toggle) { toggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }
  }

  /* ---------- Initialisierung ---------- */
  function init() {
    applyLang(lang);
    applySound();

    var langButtons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].addEventListener('click', function () {
        var chosen = this.getAttribute('data-lang');
        safeSet(LANG_KEY, chosen);
        applyLang(chosen);
      });
    }

    var toggle = document.getElementById('sound-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        soundOn = !soundOn;
        safeSet(SOUND_KEY, soundOn ? 'on' : 'off');
        applySound();
      });
    }

    /* Logo-Klick: Soundmarke abspielen, dann zur Startseite */
    var logo = document.querySelector('[data-logo]');
    if (logo) {
      logo.addEventListener('click', function (ev) {
        if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) { return; }
        if (!soundOn) { return; }
        ev.preventDefault();
        playSound();
        var onHome = /(^|\/)(index\.html)?$/.test(window.location.pathname);
        if (!onHome) {
          var target = logo.getAttribute('href');
          window.setTimeout(function () { window.location.href = target; }, SOUND_MS);
        }
      });
    }

    initContactForm();
    initPurchase();
  }

  /* ---------- Kontaktformular (keine echte Mail) ---------- */
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) { return; }

    var summary = document.getElementById('form-errors');
    var success = document.getElementById('form-success');
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var fields = [
      { id: 'firstname', de: 'Vorname', en: 'First name', type: 'text' },
      { id: 'lastname', de: 'Nachname', en: 'Last name', type: 'text' },
      { id: 'email', de: 'E-Mail-Adresse', en: 'Email address', type: 'email' },
      { id: 'subject', de: 'Betreff', en: 'Subject', type: 'text' },
      { id: 'message', de: 'Nachricht', en: 'Message', type: 'text' },
      { id: 'consent', de: 'Datenschutz-Zustimmung', en: 'Privacy consent', type: 'checkbox' }
    ];

    function setError(field, messageHtml) {
      var input = document.getElementById(field.id);
      var err = document.getElementById(field.id + '-error');
      if (messageHtml) {
        input.setAttribute('aria-invalid', 'true');
        err.innerHTML = messageHtml;
        err.hidden = false;
      } else {
        input.removeAttribute('aria-invalid');
        err.innerHTML = '';
        err.hidden = true;
      }
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      success.hidden = true;
      var errors = [];

      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var input = document.getElementById(f.id);
        var msg = '';
        if (f.type === 'checkbox') {
          if (!input.checked) {
            msg = bi('Bitte stimmen Sie der Datenschutzerklärung zu.', 'Please agree to the privacy policy.');
          }
        } else if (!input.value.trim()) {
          msg = bi('Bitte füllen Sie das Feld „' + f.de + '“ aus.', 'Please fill in the field “' + f.en + '”.');
        } else if (f.type === 'email' && !emailPattern.test(input.value.trim())) {
          msg = bi('Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@beispiel.at.', 'Please enter a valid email address, e.g. name@example.com.');
        }
        setError(f, msg);
        if (msg) { errors.push({ field: f, msg: msg }); }
      }

      if (errors.length) {
        var list = summary.querySelector('ul');
        list.innerHTML = '';
        for (var k = 0; k < errors.length; k++) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = '#' + errors[k].field.id;
          a.innerHTML = errors[k].msg;
          li.appendChild(a);
          list.appendChild(li);
        }
        summary.hidden = false;
        summary.focus();
        return;
      }

      summary.hidden = true;
      form.reset();
      success.hidden = false;
      success.focus();
    });

    summary.addEventListener('click', function (ev) {
      var link = ev.target.closest ? ev.target.closest('a') : null;
      if (!link) { return; }
      ev.preventDefault();
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) { target.focus(); }
    });
  }

  /* ---------- Kauf-Ablauf (Prototyp, keine echte Zahlung) ---------- */
  function initPurchase() {
    var form = document.getElementById('buy-form');
    if (!form) { return; }

    var result = document.getElementById('purchase-success');
    var osName = document.getElementById('dl-os');
    var fileName = document.getElementById('dl-file');
    var files = { windows: 'queueArc-Setup-Windows.exe', mac: 'queueArc-macOS.dmg', linux: 'queueArc-Linux.AppImage' };
    var names = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var chosen = form.querySelector('input[name="os"]:checked');
      var key = chosen ? chosen.value : 'windows';
      osName.textContent = names[key];
      fileName.textContent = files[key];
      result.hidden = false;
      result.focus();
      playSound();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
