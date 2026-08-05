const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();

// Body-Parser (JSON + Formulardaten), Größe begrenzt gegen Missbrauch
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// --- Health-Check: im Browser aufrufbar, um zu prüfen ob Node läuft ---
// https://js-besenrein.de/api/health  ->  {"ok":true,...}
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'js-besenrein', smtp: !!process.env.SMTP_HOST });
});

// --- Statische Website ausliefern (alle HTML-Seiten, assets/ usw.) ---
// extensions: ['html'] => /kontakt funktioniert auch ohne .html
app.use(express.static(__dirname, { extensions: ['html'] }));

// --- Mail-Transport ---
let transporter;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    // secure=true nur für Port 465, sonst false (STARTTLS auf 587)
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Kein SMTP konfiguriert -> E-Mails werden nur in die Logs geschrieben.
  // Praktisch zum lokalen Testen; in Produktion SMTP-Variablen setzen!
  console.warn('\u26A0  SMTP nicht konfiguriert \u2013 E-Mails werden nur geloggt (jsonTransport).');
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

app.post('/api/contact', async (req, res) => {
  try {
    const b = req.body || {};
    const fname = String(b.fname || '').trim();
    const lname = String(b.lname || '').trim();
    const email = String(b.email || '').trim();
    const phone = String(b.phone || '').trim();
    const service = String(b.service || '').trim();
    const message = String(b.message || '').trim();
    const consent = b.consent === true || b.consent === 'true' || b.consent === 'on';

    // Honeypot: echtes Feld ist für Menschen unsichtbar. Ausgefüllt = Bot.
    // Wir tun so, als sei alles ok, senden aber nichts.
    if (String(b.company || '').trim() !== '') {
      return res.json({ ok: true });
    }

    // Validierung
    if (!fname || !lname || !email || !message || !consent) {
      return res.status(400).json({ ok: false, error: 'invalid_input' });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    const fullName = (fname + ' ' + lname).trim();

    const textBody =
      'Neue Kontaktanfrage \u00FCber js-besenrein.de\n\n' +
      'Name:      ' + fullName + '\n' +
      'E-Mail:    ' + email + '\n' +
      'Telefon:   ' + (phone || '\u2014') + '\n' +
      'Leistung:  ' + (service || '\u2014') + '\n\n' +
      'Nachricht:\n' + message + '\n';

    const htmlBody =
      '<h2 style="margin:0 0 12px;">Neue Kontaktanfrage \u00FCber js-besenrein.de</h2>' +
      '<p><strong>Name:</strong> ' + escapeHtml(fullName) + '<br>' +
      '<strong>E-Mail:</strong> ' + escapeHtml(email) + '<br>' +
      '<strong>Telefon:</strong> ' + (escapeHtml(phone) || '\u2014') + '<br>' +
      '<strong>Leistung:</strong> ' + (escapeHtml(service) || '\u2014') + '</p>' +
      '<p><strong>Nachricht:</strong><br>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>';

    await transporter.sendMail({
      // FROM muss zum authentifizierten Postfach passen (SPF/DKIM),
      // sonst landet die Mail im Spam oder wird abgelehnt.
      from: process.env.MAIL_FROM || ('"JS Besenrein Formular" <' + (process.env.SMTP_USER || 'info@js-besenrein.de') + '>'),
      to: process.env.MAIL_TO || 'info@js-besenrein.de',
      // Antwort geht direkt an den Absender des Formulars:
      replyTo: '"' + fullName.replace(/"/g, '') + '" <' + email + '>',
      subject: 'Neue Anfrage von ' + fullName,
      text: textBody,
      html: htmlBody,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server l\u00E4uft auf Port ' + PORT));