// -----------------------------------------------------------------------------
// Pomocná funkce pro výběr prvků stránky
// -----------------------------------------------------------------------------

const selectElement = (selector) => document.querySelector(selector);

// -----------------------------------------------------------------------------
// 01 — Tmavý a světlý režim
// -----------------------------------------------------------------------------

const themeButton = selectElement('#theme');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === 'dark' ? '☼' : '◐';
  themeButton.setAttribute(
    'aria-label',
    `Přepnout na ${theme === 'dark' ? 'světlý' : 'tmavý'} režim`,
  );
}
try {
  setTheme(localStorage.getItem('qualio-theme') === 'light' ? 'light' : 'dark');
} catch {
  setTheme('dark');
}
// Uložení motivu je volitelné. Blokované úložiště nesmí zastavit ostatní ovládání.
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try {
    localStorage.setItem('qualio-theme', theme);
  } catch {}
});

// -----------------------------------------------------------------------------
// 02 — Mobilní navigace
// -----------------------------------------------------------------------------

const menu = selectElement('#menu');
const navigation = selectElement('#navigation');
function closeMenu() {
  navigation.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Otevřít menu');
}
menu.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    closeMenu();
    menu.focus();
  }
});

// -----------------------------------------------------------------------------
// 03 — Texty a ukázková data záložek služeb — upravujte zde
// -----------------------------------------------------------------------------

const services = [
  {
    title: 'Záznam kontroly přímo na pracovišti.',
    description:
      'Plánujeme záznam výsledků kontrol s vazbou na výrobek, pracoviště a směnu. Pilot má ověřit, co obsluha potřebuje zadat a co má vidět vedoucí kvality.',
    list: [
      'Plánované: zadání výsledku na pracovišti',
      'Plánované: přiřazení výrobku a směny',
      'Plánované: přehled provedených kontrol',
    ],
    name: 'Záznam kontroly',
    heading: 'Každý výsledek má své místo.',
    column: 'Kontrola',
    rows: [
      ['VZ–10458', 'Rozměry hřídele', '✓ Vyhovuje'],
      ['VZ–10459', 'Drsnost povrchu', '✓ Vyhovuje'],
      ['VZ–10460', 'Vizuální kontrola', '! Prověřit'],
    ],
  },
  {
    title: 'Neshoda s návazností na kontrolu.',
    description:
      'Plánujeme spojení zjištěné odchylky s konkrétní kontrolou. V pilotu probereme, kdo neshodu řeší a jak si tým předává informace mezi směnami.',
    list: [
      'Plánované: popis a přiřazení neshody',
      'Plánované: přehled stavu řešení',
      'Plánované: návaznost na kontrolu a směnu',
    ],
    name: 'Evidence neshody',
    heading: 'Informace, které navazují.',
    column: 'Neshoda',
    rows: [
      ['N–00241', 'Odchylka rozměru', '✓ Uzavřeno'],
      ['N–00242', 'Vada povrchu', '✓ Uzavřeno'],
      ['N–00243', 'Poškozený obal', '! V řešení'],
    ],
  },
  {
    title: 'Přehled výsledků jednotlivých směn.',
    description:
      'Plánujeme souhrn kontrol a neshod po směnách. S vedoucími kvality a výroby ověříme, které údaje potřebují při předání směny a pro reporting.',
    list: [
      'Plánované: souhrn provedených kontrol',
      'Plánované: přehled neshod za směnu',
      'Plánované: podklady pro směnový report',
    ],
    name: 'Směnový report',
    heading: 'Výsledky směny v souvislostech.',
    column: 'Směna',
    rows: [
      ['SM–001', 'Ranní · linka A', '12 kontrol'],
      ['SM–002', 'Odpolední · linka A', '18 kontrol'],
      ['SM–003', 'Noční · linka A', '! 2 neshody'],
    ],
  },
];

// -----------------------------------------------------------------------------
// 04 — Přepínání služeb a ovládání klávesnicí
// -----------------------------------------------------------------------------

const tabs = [...document.querySelectorAll('[role=tab]')];
function selectTab(index) {
  const service = services[index];
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  selectElement('#service-panel').setAttribute('aria-labelledby', `tab-${index}`);
  selectElement('#service-number').textContent = String(index + 1).padStart(2, '0');
  selectElement('#service-title').textContent = service.title;
  selectElement('#service-description').textContent = service.description;
  selectElement('#service-list').replaceChildren(
    ...service.list.map((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }),
  );
  selectElement('#dashboard-name').textContent = service.name;
  selectElement('#dashboard-heading').textContent = service.heading;
  selectElement('#column-label').textContent = service.column;
  selectElement('#demo-rows').replaceChildren(
    ...service.rows.map((row) => {
      const tr = document.createElement('tr');
      row.forEach((text, i) => {
        const td = document.createElement('td');
        if (i === 2) {
          const badge = document.createElement('span');
          badge.className = 'status' + (text.startsWith('!') ? ' warning' : '');
          badge.textContent = text;
          td.append(badge);
        } else td.textContent = text;
        tr.append(td);
      });
      return tr;
    }),
  );
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  tab.addEventListener('keydown', (event) => {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = tabs.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      selectTab(target);
      tabs[target].focus();
    }
  });
});

// -----------------------------------------------------------------------------
// 05 — Zájem o pilot. Úspěch zobrazíme pouze po potvrzení serverem.
// -----------------------------------------------------------------------------

const form = selectElement('#contact-form');
const submitButton = form.querySelector('[type=submit]');
const formStatus = selectElement('#form-status');
const errorBox = selectElement('#form-error');
const resultBox = selectElement('#form-result');
let sending = false;
let accepted = false;
let submissionId = crypto.randomUUID();

function clearErrors() {
  errorBox.hidden = true;
  for (const field of ['name', 'email', 'company', 'message']) {
    form.elements[field].removeAttribute('aria-invalid');
    form.elements[field].removeAttribute('aria-describedby');
    selectElement('#error-' + field).textContent = '';
  }
}

async function loadPilotDetails() {
  try {
    const response = await fetch('/api/pilot', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return;
    const details = await response.json();
    if (details.operator) {
      selectElement('#form-privacy').textContent =
        'Údaje použijeme k vyřízení zájmu o pilot. Provozovatel: ' +
        details.operator.name +
        ', kontakt: ' +
        details.operator.email +
        '.';
    }
    if (!details.available)
      formStatus.textContent = 'Neveřejný náhled: příjem poptávek ještě není zapojený.';
  } catch {
    formStatus.textContent =
      'Stav příjmu se nepodařilo ověřit. Při odeslání zkusíme spojení znovu.';
  }
}

form.addEventListener('input', () => {
  if (!sending && !accepted) submissionId = crypto.randomUUID();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending || accepted) return;
  clearErrors();
  for (const name of ['name', 'email', 'company'])
    form.elements[name].value = form.elements[name].value.trim();
  if (!form.reportValidity()) return;
  sending = true;
  submitButton.disabled = true;
  selectElement('#retry-submit').disabled = true;
  submitButton.textContent = 'Odesílám…';
  form.setAttribute('aria-busy', 'true');
  formStatus.textContent = 'Odesíláme váš zájem o pilot. Vyčkejte prosím.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const fields = new FormData(form);
    const response = await fetch('/api/pilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: fields.get('name'),
        email: fields.get('email'),
        company: fields.get('company'),
        message: fields.get('message'),
        website: fields.get('website'),
        submissionId,
      }),
      signal: controller.signal,
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        'Server neposlal platné potvrzení. Údaje zůstaly ve formuláři; zkuste to znovu.',
      );
    }
    if (!response.ok || result.ok !== true || result.receipt !== submissionId) {
      for (const [name, message] of Object.entries(result.errors || {})) {
        if (!['name', 'email', 'company', 'message'].includes(name)) continue;
        form.elements[name].setAttribute('aria-invalid', 'true');
        form.elements[name].setAttribute('aria-describedby', 'error-' + name);
        selectElement('#error-' + name).textContent = message;
      }
      throw new Error(result.message || 'Poptávku se nepodařilo přijmout. Zkuste to prosím znovu.');
    }
    accepted = true;
    resultBox.hidden = false;
    formStatus.textContent = '';
    submitButton.hidden = true;
    for (const name of ['name', 'email', 'company', 'message']) form.elements[name].readOnly = true;
    resultBox.focus();
  } catch (error) {
    selectElement('#form-error-text').textContent =
      error.name === 'AbortError'
        ? 'Odeslání trvá příliš dlouho a přijetí se nepodařilo ověřit. Údaje zůstaly ve formuláři; zkuste to znovu.'
        : error instanceof TypeError
          ? 'Spojení se nezdařilo. Zkontrolujte připojení a zkuste to znovu. Údaje zůstaly ve formuláři.'
          : error.message;
    errorBox.hidden = false;
    formStatus.textContent = '';
  } finally {
    clearTimeout(timeout);
    sending = false;
    form.removeAttribute('aria-busy');
    submitButton.disabled = false;
    selectElement('#retry-submit').disabled = false;
    submitButton.textContent = 'Mám zájem o pilot';
  }
});

selectElement('#retry-submit').addEventListener('click', () => form.requestSubmit());
selectElement('#new-request').addEventListener('click', () => {
  form.reset();
  accepted = false;
  submissionId = crypto.randomUUID();
  resultBox.hidden = true;
  submitButton.hidden = false;
  for (const name of ['name', 'email', 'company', 'message']) form.elements[name].readOnly = false;
  clearErrors();
  form.elements.name.focus();
});

submitButton.disabled = false;
loadPilotDetails();
