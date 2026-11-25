import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';

// Konfigurace zůstává na serveru. Žádný příjemce ani SMTP heslo nejdou do app.js.
export function readPilotConfig(env = process.env) {
  const value = (key) => (env[key] || '').trim();
  const port = Number(value('SMTP_PORT') || 587);
  const config = {
    host: value('SMTP_HOST'),
    port,
    secure: value('SMTP_SECURE') === 'true',
    user: value('SMTP_USER'),
    password: value('SMTP_PASSWORD'),
    from: value('PILOT_FROM'),
    to: value('PILOT_TO'),
    operatorName: value('OPERATOR_NAME'),
    operatorEmail: value('OPERATOR_EMAIL'),
  };
  const required = {
    SMTP_HOST: config.host,
    SMTP_USER: config.user,
    SMTP_PASSWORD: config.password,
    PILOT_FROM: config.from,
    PILOT_TO: config.to,
    OPERATOR_NAME: config.operatorName,
    OPERATOR_EMAIL: config.operatorEmail,
  };
  config.missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([key]) => key);
  if (!Number.isInteger(port) || port < 1 || port > 65535) config.missing.push('SMTP_PORT');
  for (const [key, email] of [
    ['PILOT_FROM', config.from],
    ['PILOT_TO', config.to],
    ['OPERATOR_EMAIL', config.operatorEmail],
  ]) {
    if (email && !validEmail(email)) config.missing.push(key);
  }
  // Port 465 používá TLS od začátku; ostatní porty musí úspěšně přejít na STARTTLS.
  if (port === 465 && !config.secure) config.missing.push('SMTP_SECURE');
  config.ready = config.missing.length === 0;
  return config;
}

function validEmail(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email)
  );
}

export function validatePilot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { errors: { form: 'Neplatný obsah formuláře.' } };
  const errors = {};
  const text = (key, max, label) => {
    const value = input[key];
    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      value.trim().length > max ||
      /[\x00-\x1f\x7f]/.test(value)
    )
      errors[key] = `Vyplňte ${label} (nejvýše ${max} znaků).`;
    return typeof value === 'string' ? value.trim() : '';
  };
  const name = text('name', 100, 'jméno');
  const company = text('company', 160, 'firmu');
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!validEmail(email)) errors.email = 'Vyplňte platný pracovní e-mail.';
  const message = input.message === undefined ? '' : input.message;
  if (
    typeof message !== 'string' ||
    message.length > 3000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message)
  )
    errors.message = 'Doplňující text může mít nejvýše 3000 znaků.';
  if (input.website && (typeof input.website !== 'string' || input.website.trim()))
    errors.form = 'Formulář se nepodařilo ověřit. Zkuste to znovu.';
  if (typeof input.submissionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(input.submissionId))
    errors.form = 'Obnovte stránku a zkuste to znovu.';
  return {
    errors,
    data: {
      name,
      company,
      email,
      message: typeof message === 'string' ? message.trim() : '',
      submissionId: input.submissionId,
    },
  };
}

export function createPilotService({
  config = readPilotConfig(),
  transportFactory = nodemailer.createTransport,
  now = Date.now,
} = {}) {
  const attempts = new Map();
  const submissions = new Map();
  const windowMs = 15 * 60 * 1000;
  let transport;
  const publicConfig = () => ({
    available: config.ready,
    operator:
      config.operatorName && config.operatorEmail
        ? { name: config.operatorName, email: config.operatorEmail }
        : null,
  });
  async function submit(input, clientAddress) {
    // Omezené mapy v paměti: pro více instancí přidejte sdílený rate limit a idempotenci.
    const time = now();
    for (const [key, item] of attempts) if (item.until <= time) attempts.delete(key);
    for (const [key, item] of submissions) if (item.until <= time) submissions.delete(key);
    const client = createHash('sha256')
      .update(clientAddress || 'unknown')
      .digest('hex');
    const attempt = attempts.get(client) || { count: 0, until: time + windowMs };
    if (attempt.count >= 5 || (!attempts.has(client) && attempts.size >= 10000))
      return {
        status: 429,
        body: { ok: false, message: 'Příliš mnoho pokusů. Zkuste to prosím za 15 minut.' },
      };
    attempt.count++;
    attempts.set(client, attempt);
    const { data, errors } = validatePilot(input);
    if (Object.keys(errors).length)
      return {
        status: 422,
        body: { ok: false, message: 'Zkontrolujte prosím vyplněné údaje.', errors },
      };
    if (!config.ready)
      return {
        status: 503,
        body: {
          ok: false,
          message:
            'Příjem poptávek ještě není v tomto náhledu zapojený. Poptávka nebyla přijata. Zkuste to prosím později.',
        },
      };
    const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const previous = submissions.get(data.submissionId);
    if (previous && previous.fingerprint !== fingerprint)
      return {
        status: 409,
        body: {
          ok: false,
          message: 'Obsah poptávky se změnil. Obnovte stránku a odešlete ji znovu.',
        },
      };
    if (previous) return previous.result;
    if (submissions.size >= 10000)
      return {
        status: 503,
        body: { ok: false, message: 'Příjem je dočasně vytížený. Zkuste to prosím znovu.' },
      };
    const entry = { fingerprint, until: time + windowMs };
    entry.result = Promise.resolve().then(async () => {
      try {
        transport ||= transportFactory({
          host: config.host,
          port: config.port,
          secure: config.secure,
          requireTLS: !config.secure,
          auth: { user: config.user, pass: config.password },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          disableFileAccess: true,
          disableUrlAccess: true,
          logger: false,
          debug: false,
        });
        const info = await transport.sendMail({
          from: config.from,
          to: config.to,
          replyTo: { name: data.name, address: data.email },
          subject: 'Zájem o pilot — Qualio',
          text: `Zájem o pilotní nasazení Qualio\n\nJméno: ${data.name}\nPracovní e-mail: ${data.email}\nFirma: ${data.company}\n\nJak dnes evidujete kontroly a neshody?\n${data.message || '(neuvedeno)'}\n\nIdentifikátor poptávky: ${data.submissionId}`,
          headers: { 'X-Pilot-Submission': data.submissionId },
        });
        // Úspěch pouze po potvrzení přijetí příjemce serverem SMTP, ne po validaci formuláře.
        if (
          !info.accepted?.some(
            (address) => String(address).toLowerCase() === config.to.toLowerCase(),
          )
        )
          throw new Error('Recipient not accepted');
        return {
          status: 200,
          body: { ok: true, receipt: data.submissionId, message: 'Poptávku jsme přijali' },
        };
      } catch {
        submissions.delete(data.submissionId);
        // Do odpovědi ani logů nevkládáme citlivé údaje, SMTP odpovědi nebo hesla.
        return {
          status: 502,
          body: {
            ok: false,
            message:
              'Odeslání se nepodařilo potvrdit. Údaje zůstaly ve formuláři; zkuste to prosím znovu.',
          },
        };
      }
    });
    submissions.set(data.submissionId, entry);
    return entry.result;
  }
  return { publicConfig, submit };
}

// Stejný endpoint používá náhled i sestavení pro Node hosting.
export async function handlePilotRequest(req, res, service) {
  const send = (status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 429 ? { 'Retry-After': '900' } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
  };
  if (req.method === 'GET' || req.method === 'HEAD') return send(200, service.publicConfig());
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    return send(405, { ok: false, message: 'Nepodporovaná metoda.' });
  }
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return send(403, {
          ok: false,
          message: 'Požadavek nelze ověřit. Otevřete formulář přímo na webu.',
        });
    } catch {
      return send(403, { ok: false, message: 'Požadavek nelze ověřit.' });
    }
  }
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json')
    return send(415, {
      ok: false,
      message: 'Formulář vyžaduje JavaScript. Zapněte jej a zkuste to znovu.',
    });
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16000) {
        send(413, {
          ok: false,
          message: 'Poptávka je příliš dlouhá. Zkraťte text a zkuste to znovu.',
        });
        return;
      }
      chunks.push(chunk);
    }
    let input;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(400, { ok: false, message: 'Neplatný obsah formuláře.' });
    }
    const result = await service.submit(input, req.socket.remoteAddress);
    return send(result.status, result.body);
  } catch {
    return send(500, { ok: false, message: 'Odeslání se nezdařilo. Zkuste to prosím znovu.' });
  }
}
