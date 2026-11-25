import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createPilotService, readPilotConfig, validatePilot } from '../pilot.mjs';
import { createServer } from '../server.mjs';
import { settings } from '../seo.mjs';

// Adresy .test a hesla níže jsou pouze izolovaná testovací data, nikdy příjemci webu.
const configured = () =>
  readPilotConfig({
    SMTP_HOST: 'smtp.test',
    SMTP_USER: 'test',
    SMTP_PASSWORD: 'test-only',
    PILOT_FROM: 'sender@example.test',
    PILOT_TO: 'receiver@example.test',
    OPERATOR_NAME: 'Testovací provozovatel',
    OPERATOR_EMAIL: 'operator@example.test',
  });
const payload = () => ({
  name: 'Jana Testovací',
  email: 'jana@example.test',
  company: 'Testovací výroba',
  message: '',
  website: '',
  submissionId: randomUUID(),
});
const serviceWith = (sendMail) =>
  createPilotService({ config: configured(), transportFactory: () => ({ sendMail }) });
async function withApi(service, run) {
  const server = createServer(settings(), { pilotService: service });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const submit = (body, options = {}) =>
    fetch(origin + '/api/pilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...options,
    });
  try {
    await run({ origin, submit });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('required fields and optional process description are validated on the server', () => {
  assert.deepEqual(validatePilot(payload()).errors, {});
  for (const field of ['name', 'company', 'email'])
    assert.ok(validatePilot({ ...payload(), [field]: '  ' }).errors[field]);
  for (const email of ['x', 'a@b', 'a@example.test\r\nBcc: victim@example.test'])
    assert.ok(validatePilot({ ...payload(), email }).errors.email);
  assert.ok(validatePilot({ ...payload(), name: 'x\ny' }).errors.name);
  assert.ok(validatePilot({ ...payload(), message: 'x'.repeat(3001) }).errors.message);
  assert.ok(validatePilot({ ...payload(), website: 'spam' }).errors.form);
  assert.ok(validatePilot({ ...payload(), submissionId: 'bad' }).errors.form);
  assert.deepEqual(validatePilot({ ...payload(), message: 'Kontroly\nPředání směny' }).errors, {});
});

test('missing configuration never pretends to receive a lead and exposes no secrets', async () => {
  const service = createPilotService({ config: readPilotConfig({}) });
  await withApi(service, async ({ origin, submit }) => {
    const state = await (await fetch(origin + '/api/pilot')).json();
    assert.deepEqual(state, { available: false, operator: null });
    const response = await submit(payload());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  });
});

test('SMTP receipt is required, optional message works and reply-to is the visitor', async () => {
  let delivered;
  const service = serviceWith(async (message) => {
    delivered = message;
    return { accepted: ['receiver@example.test'] };
  });
  await withApi(service, async ({ origin, submit }) => {
    const input = payload();
    const response = await submit(input);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.receipt, input.submissionId);
    assert.equal(delivered.to, 'receiver@example.test');
    assert.equal(delivered.replyTo.address, input.email);
    assert.ok(delivered.text.includes('(neuvedeno)'));
    const state = await (await fetch(origin + '/api/pilot')).text();
    assert.ok(!state.includes('test-only'));
    assert.ok(!state.includes('smtp.test'));
    assert.ok(!state.includes('receiver@'));
  });
});

test('rejected recipient and service failures are not success, retry can succeed', async () => {
  let attempts = 0;
  const service = serviceWith(async () =>
    ++attempts === 1
      ? { accepted: [], rejected: ['receiver@example.test'] }
      : { accepted: ['receiver@example.test'] },
  );
  const input = payload();
  const first = await service.submit(input, 'client');
  assert.equal(first.status, 502);
  assert.equal(first.body.ok, false);
  const retry = await service.submit(input, 'client');
  assert.equal(retry.status, 200);
  assert.equal(attempts, 2);
  const failing = serviceWith(async () => {
    throw new Error('private SMTP details');
  });
  const failure = await failing.submit(payload(), 'client');
  assert.equal(failure.status, 502);
  assert.ok(!JSON.stringify(failure).includes('private SMTP details'));
});

test('confirmation waits for SMTP acceptance and repeated submissions share one delivery', async () => {
  let accept;
  let calls = 0;
  const service = serviceWith(() => {
    calls++;
    return new Promise((resolve) => {
      accept = resolve;
    });
  });
  const input = payload();
  let completed = false;
  const first = service.submit(input, 'client').then((result) => {
    completed = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  const duplicate = service.submit(input, 'client');
  accept({ accepted: ['receiver@example.test'] });
  assert.equal((await first).status, 200);
  assert.equal((await duplicate).status, 200);
  assert.equal(calls, 1);
  assert.equal((await service.submit({ ...input, company: 'Změna' }, 'client')).status, 409);
});

test('rate limit bounds repeated attempts', async () => {
  const service = serviceWith(async () => ({ accepted: ['receiver@example.test'] }));
  for (let i = 0; i < 5; i++) assert.equal((await service.submit(payload(), 'client')).status, 200);
  assert.equal((await service.submit(payload(), 'client')).status, 429);
});

test('API rejects malformed bodies, foreign origins and oversized requests', async () => {
  await withApi(
    serviceWith(async () => ({ accepted: ['receiver@example.test'] })),
    async ({ origin, submit }) => {
      assert.equal((await submit({})).status, 422);
      assert.equal(
        (await submit(payload(), { headers: { 'Content-Type': 'text/plain' } })).status,
        415,
      );
      assert.equal((await submit(payload(), { body: '{broken' })).status, 400);
      assert.equal(
        (
          await submit(payload(), {
            headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.test' },
          })
        ).status,
        403,
      );
      assert.equal((await submit({ ...payload(), message: 'x'.repeat(20000) })).status, 413);
      assert.equal((await fetch(origin + '/api/pilot', { method: 'DELETE' })).status, 405);
    },
  );
});

test('configured SMTP transport requires encrypted delivery and blocks file/URL access', async () => {
  let options;
  const service = createPilotService({
    config: configured(),
    transportFactory: (settings) => {
      options = settings;
      return { sendMail: async () => ({ accepted: ['receiver@example.test'] }) };
    },
  });
  await service.submit(payload(), 'client');
  assert.equal(options.requireTLS, true);
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(readPilotConfig({ ...{ SMTP_PORT: '465' }, SMTP_SECURE: 'false' }).ready, false);
});

test('preview stays noindex and has the requested pilot funnel and accessible form', async () => {
  assert.equal(settings().canIndex, false);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /name="robots"\s+content="noindex, follow"/);
  assert.ok(!html.includes('id="download"'));
  assert.ok(!html.includes('id="copy"'));
  for (const name of ['name', 'email', 'company'])
    assert.match(html, new RegExp('<input[^>]*name="' + name + '"[^>]*required', 's'));
  const message = html.match(/<textarea[^>]*name="message"[^>]*>/s)[0];
  assert.ok(!message.includes('required'));
  assert.ok(!message.includes('minlength'));
  assert.ok(html.includes('action="/api/pilot"'));
  assert.match(html, /id="form-result"[^>]*hidden/s);
  const ctas = [...html.matchAll(/<a class="button(?: small)?" href="#kontakt">([\s\S]*?)<\/a>/g)];
  assert.ok(ctas.length >= 2);
  assert.ok(ctas.every((match) => match[1].trim() === 'Mám zájem o pilot'));
  assert.ok(html.includes('Aplikace je ve vývoji. Hledáme výrobní firmy pro pilotní nasazení.'));
  assert.ok(html.includes('Směnový report'));
});
