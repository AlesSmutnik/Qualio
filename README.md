# Qualio — web pro nábor do pilotu

Prezentační web připravované aplikace pro evidenci kontrol kvality, neshod a směnový reporting. Qualio je pracovní název. Projekt je určený k neveřejnému náhledu a má vypnutou indexaci.

## Lokální spuštění

Vyžaduje Node.js 24 a npm.

```sh
npm ci
npm start
```

Náhled běží na `http://localhost:3000/`. Jiný port lze nastavit proměnnou `PORT`.

## Příjem poptávek

Zkopírujte `.env.example` do `.env` a doplňte skutečné údaje SMTP služby, odesílatele, příjemce a provozovatele. `.env` ani soukromé klíče nepatří do Gitu. Bez konfigurace vrací server při pokusu o odeslání srozumitelnou chybu; přijetí nesimuluje.

Formulář vyžaduje Node server a endpoint `/api/pilot`. Samotný statický hosting pro jeho odesílání nestačí. Potvrzení znamená přijetí SMTP službou, nikoli ověřené doručení do schránky.

## Kontroly a sestavení

```sh
npm run format:check
npm run check
npm test
npm run build
```

Sestavení vznikne ve složce `dist/`, která se do Gitu nenahrává. Podklady k sestavení a prázdná konfigurace `.env.example` v repozitáři zůstávají. Soukromé údaje se do sestavení nekopírují. Před vzdáleným náhledem nastavte přístupovou ochranu na hostingu; `noindex` samo o sobě neomezuje přístup.

## Úpravy obsahu

- `index.html` — obsah hlavní stránky.
- `style.css` — vzhled a responzivita.
- `app.js` — interakce, modelová data a formulář.
- `pilot.mjs` — serverové zpracování poptávek a SMTP.
- `seo.config.json` — metadata a indexace.
- `guide.mjs`, `content.mjs` — zdroj již existujícího průvodce.
- `npm run seo:prepare` — obnoví generované HTML a SEO soubory.
- `npm run format` — naformátuje zdrojové soubory.

Další orientace v projektu: [EDITACE.txt](EDITACE.txt), [přehled webu](PREHLED-WEBU.md) a [SEO poznámky](SEO.txt). Starší přehledy zachycují předchozí fáze vývoje; aktuální formulář již používá serverový příjem poptávek.

Veřejné nasazení, změny DNS a povolení indexace vyžadují samostatné potvrzení finální značky.
