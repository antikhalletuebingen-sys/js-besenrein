const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Env sauber lesen: umschließende Anführungszeichen + Leerzeichen entfernen.
// (Railway speichert Werte teils inkl. der Quotes -> das killt Host/Port/Key.)
function env(name, fallback) {
  var v = process.env[name];
  if (v == null) return fallback;
  v = String(v).trim().replace(/^['"]|['"]$/g, '').trim();
  return v === '' ? fallback : v;
}

var MAIL_TO   = env('MAIL_TO', 'info@js-besenrein.de');
var MAIL_FROM = env('MAIL_FROM', 'JS Besenrein Formular <info@js-besenrein.de>');
var RESEND_API_KEY = env('RESEND_API_KEY', '');
var SMTP_HOST = env('SMTP_HOST', '');

// Welche Versandart ist aktiv?
var MODE = RESEND_API_KEY ? 'resend' : (SMTP_HOST ? 'smtp' : 'log');
console.log('Mailversand-Modus: ' + MODE);

// --- SMTP-Transport (nur genutzt, wenn RESEND_API_KEY fehlt und SMTP_HOST gesetzt ist) ---
var transporter = null;
if (MODE === 'smtp') {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_SECURE', 'false') === 'true',
    auth: { user: env('SMTP_USER', ''), pass: env('SMTP_PASS', '') },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
} else if (MODE === 'log') {
  console.warn('\u26A0  Kein RESEND_API_KEY / SMTP konfiguriert \u2013 Mails werden nur geloggt.');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Versand-Abstraktion: Resend (HTTPS) ODER SMTP ODER Log
async function sendMail(opts) {
  if (MODE === 'resend') {
    var resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        reply_to: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!resp.ok) {
      var body = await resp.text();
      throw new Error('Resend HTTP ' + resp.status + ': ' + body);
    }
    return;
  }
  if (MODE === 'smtp') {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: opts.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return;
  }
  console.log('--- MAIL (nur Log) ---\n' + opts.text + '\n----------------------');
}

// Health-Check: https://js-besenrein.de/api/health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'js-besenrein', mode: MODE });
});

// Statische Website ausliefern
app.use(express.static(__dirname, { extensions: ['html'] }));

app.post('/api/contact', async (req, res) => {
  try {
    var b = req.body || {};
    var fname = String(b.fname || '').trim();
    var lname = String(b.lname || '').trim();
    var email = String(b.email || '').trim();
    var phone = String(b.phone || '').trim();
    var service = String(b.service || '').trim();
    var message = String(b.message || '').trim();
    var consent = b.consent === true || b.consent === 'true' || b.consent === 'on';

    // Honeypot
    if (String(b.company || '').trim() !== '') return res.json({ ok: true });

    if (!fname || !lname || !email || !message || !consent) {
      return res.status(400).json({ ok: false, error: 'invalid_input' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    var fullName = (fname + ' ' + lname).trim();
    var text =
      'Neue Kontaktanfrage \u00FCber js-besenrein.de\n\n' +
      'Name:      ' + fullName + '\n' +
      'E-Mail:    ' + email + '\n' +
      'Telefon:   ' + (phone || '\u2014') + '\n' +
      'Leistung:  ' + (service || '\u2014') + '\n\n' +
      'Nachricht:\n' + message + '\n';
    var html =
      '<h2 style="margin:0 0 12px;">Neue Kontaktanfrage \u00FCber js-besenrein.de</h2>' +
      '<p><strong>Name:</strong> ' + escapeHtml(fullName) + '<br>' +
      '<strong>E-Mail:</strong> ' + escapeHtml(email) + '<br>' +
      '<strong>Telefon:</strong> ' + (escapeHtml(phone) || '\u2014') + '<br>' +
      '<strong>Leistung:</strong> ' + (escapeHtml(service) || '\u2014') + '</p>' +
      '<p><strong>Nachricht:</strong><br>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>';

    await sendMail({
      replyTo: fullName.replace(/"/g, '') + ' <' + email + '>',
      subject: 'Neue Anfrage von ' + fullName,
      text: text,
      html: html,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server l\u00E4uft auf Port ' + PORT));