# QUALIO — shrnutí webu a plán dokončení

_Stav dokumentu: 24. listopadu 2026._

## 1. Co projekt představuje

QUALIO je připravovaný SaaS pro řízení kvality výroby (QMS). Web představuje jeho zaměření, plánované oblasti použití a ukázkové prostředí. Hlavní doména v konfiguraci je **https://qualio.cz/**.

Projekt je **ve vývoji**. Současný web je prezentační stránka s interaktivní ukázkou, nikoli dokončená aplikace pro skutečné řízení výroby. Dostupnost funkcí, cena, integrace a termín spuštění zatím nejsou potvrzené.

Zamýšlenými návštěvníky jsou manažeři kvality, kontroloři a vedoucí výroby, například ve strojírenství, automotive a elektronice. Hlavní akcí návštěvníka je seznámit se s konceptem a připravit poptávku.

## 2. Stránky a obsah

### Hlavní stránka — `index.html`

| Část               | Co obsahuje                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Hlavička           | Logo, odkazy na sekce, změnu barevného režimu a mobilní menu.                                          |
| Úvod               | Hlavní sdělení „Kvalita pod kontrolou“, vizualizaci kontroly a odkazy na představení řešení.           |
| Služby             | Přepínané ukázky kontrolních plánů, řízení neshod a přehledů pro audity.                               |
| Popisy oblastí     | Vysvětlení kontrolních plánů, evidence měření, neshod a podkladů pro audit dostupné i bez JavaScriptu. |
| Časté otázky       | Odpovědi na otázky o QMS, výběru systému a aktuálním stavu QUALIO.                                     |
| Modelové reference | Scénáře využití v jednotlivých oborech. Nejde o skutečné zákaznické reference.                         |
| O projektu         | Zaměření vyvíjeného řešení, jeho principy a odkaz na průvodce.                                         |
| Kontakt            | Formulář pro přípravu textu poptávky.                                                                  |
| Patička            | Značku, stav projektu, odkazy a návrat nahoru.                                                         |

### Průvodce — `vyber-systemu-kvality.html`

Samostatná stránka vysvětluje, jak vybírat systém řízení kvality výroby. Obsahuje:

- Rozlišení zaměření QMS, ERP a MES.
- Modelový scénář od kontrolního plánu přes měření až po řešení neshody.
- Checklist pro předvedení a porovnání řešení.
- Otázky k migraci dat, ceně, dostupnosti a ochraně dat.
- Pravdivé vymezení současného stavu projektu QUALIO.

Zdrojový text se upravuje v `guide.mjs`, metadata v `content.mjs`. HTML soubor se vytváří příkazem `npm run seo:prepare`; přímé úpravy v generovaném HTML by se při dalším generování přepsaly.

## 3. Co na webu skutečně funguje

### Vzhled a navigace

- Responzivní rozvržení pro počítače, tablety a mobilní telefony.
- Tmavý a světlý režim na hlavní stránce s uložením volby do `localStorage`.
- Mobilní menu včetně zavření klávesou Escape.
- Odkazy na jednotlivé sekce a návrat na začátek stránky.
- Rozbalovací informace a časté otázky.
- Viditelné zvýraznění ovládacích prvků při práci klávesnicí.
- Zohlednění uživatelského nastavení pro omezení pohybu.

### Ukázka služeb

Záložky přepínají nadpis, popis, seznam bodů a ukázkové řádky tabulky. Podporují myš i klávesy se šipkami, Home a End.

**Tabulky, grafy a procenta jsou modelová data.** Web neprovádí skutečná měření, nevyhodnocuje výrobní proces a neukládá kontrolní záznamy do databáze.

### Formulář

Formulář kontroluje povinná pole a formát e-mailu pomocí HTML validace. Po vyplnění sestaví text poptávky, který lze:

1. Zkontrolovat přímo na stránce.
2. Zkopírovat do schránky, pokud to prohlížeč dovolí.
3. Stáhnout jako soubor `poptavka-qualio.txt`.

**Formulář nic neodesílá.** Nemá napojení na e-mailovou službu, CRM ani databázi. Pro jeho obsluhu je potřeba JavaScript.

## 4. Technické řešení a orientace v souborech

Web používá HTML, CSS a běžný JavaScript bez frontendového frameworku. Součástí projektu je jednoduchý Node.js server. Prettier slouží pouze pro vývojové formátování.

| Soubor / složka                     | Účel a místo úprav                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `index.html`                        | Hlavní obsah webu; sekce jsou označené českými komentáři.                                            |
| `style.css`                         | Barvy, typografie, komponenty, mobilní rozvržení a vzhled průvodce.                                  |
| `app.js`                            | Motiv, mobilní navigace, přepínání služeb a práce s poptávkou. Texty záložek jsou v poli `services`. |
| `seo.config.json`                   | Doména, značka, titulek, popis a ověřovací kódy vyhledávačů.                                         |
| `seo.mjs`                           | Generování metadat, strukturovaných dat, robots.txt a sitemapy.                                      |
| `guide.mjs`                         | Šablona a obsah průvodce výběrem systému.                                                            |
| `content.mjs`                       | Adresa a metadata průvodce.                                                                          |
| `scripts/prepare-seo.mjs`           | Obnovení SEO bloku, průvodce a souborů pro vyhledávače.                                              |
| `server.mjs`                        | Lokální server, veřejné cesty, přesměrování, cache a chybové odpovědi.                               |
| `tests/seo.test.mjs`                | Automatické SEO a HTTP testy.                                                                        |
| `assets/`                           | Obrázky a favicon.                                                                                   |
| `design/`                           | Pět návrhových obrázků, podle kterých vznikal vzhled webu.                                           |
| `.prettierrc.json`, `.editorconfig` | Pravidla čitelného formátování a odsazení.                                                           |
| `EDITACE.txt`                       | Stručný návod k úpravám souborů.                                                                     |
| `SEO.txt`                           | Podrobnosti SEO, alokace témat a kroky k nasazení.                                                   |

Výchozí obsah první záložky je také v `index.html`. Při změně textů služeb je proto potřeba zkontrolovat HTML i pole `services` v `app.js`.

## 5. SEO a dohledatelnost v AI

V projektu jsou připravené:

- Titulky, popisy a canonical URL pro doménu `qualio.cz`.
- Open Graph a Twitter metadata včetně obrázku pro sdílení.
- Strukturovaná data `WebSite` a `WebPage`; průvodce má také `BreadcrumbList`.
- `robots.txt` s povoleným procházením a výslovně povoleným `OAI-SearchBot`.
- Sitemap se dvěma stránkami: hlavní stránkou a průvodcem.
- Obsah dostupný bez vykonání JavaScriptu a vzájemné propojení stránek.
- Optimalizovaný hlavní obrázek s uvedenými rozměry a prioritou načtení.
- Skutečné odpovědi 404 a přesměrování `/index.html` na `/` v Node serveru.

Tyto úpravy připravují web pro procházení a porozumění obsahu. **Nezaručují indexaci, pozici ve vyhledávání ani doporučení v odpovědích AI.** Veřejné nasazení a indexace zatím nebyly potvrzené. Ověřovací kódy Google a Bing jsou v konfiguraci prázdné.

## 6. Spuštění a běžná údržba

Příkazy se spouštějí v kořenové složce projektu:

```sh
npm install
npm start
```

Lokální náhled používá adresu **http://localhost:3000/** a má nastavené `noindex`.

| Příkaz                     | Význam                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run format`           | Naformátuje zdrojové soubory.                                                                       |
| `npm run format:check`     | Zkontroluje formátování bez přepisování.                                                            |
| `npm run seo:prepare`      | Obnoví generované SEO soubory a stránku průvodce.                                                   |
| `npm run check`            | Zkontroluje syntaxi JavaScriptu.                                                                    |
| `npm test`                 | Spustí automatické testy.                                                                           |
| `npm run serve:production` | Spustí Node server s produkční indexací; pro veřejný provoz potřebuje odpovídající hosting a HTTPS. |

Při posledním ověřování před vytvořením tohoto přehledu prošla kontrola formátování, syntaxe a všech **10 automatických testů**. Testy ověřují hlavně SEO, HTTP odpovědi a dostupnost obsahu; nenahrazují vizuální a uživatelské testování v prohlížeči.

## 7. Co zatím není dokončené

- Samotná QMS aplikace pro reálné uživatele a výrobní data.
- Přihlášení, uživatelské role, databáze a ukládání záznamů.
- Skutečné odesílání poptávek a potvrzení jejich doručení.
- Potvrzené funkce, cena, termín dostupnosti a integrace.
- Identifikace provozovatele, skutečný obchodní kontakt a provozní podmínky.
- Ověřitelné reference a výsledky nasazení u zákazníků.
- Potvrzené veřejné nasazení, ověření domény ve vyhledávačích a měření výkonu.
- Anglická jazyková verze; současný web je český.

## 8. Návrhy pro pokračování a dokončení

### Priorita 1 — Upřesnit produkt a účel webu

Sepsat cílového zákazníka, konkrétní problém, rozsah první verze a dostupnost jednotlivých funkcí. Rozhodnout, zda má web nyní sbírat zájem o vývoj, žádosti o pilotní provoz, nebo poptávky představení konceptu.

**Výsledek:** schválený popis produktu a jednoznačná hlavní akce návštěvníka. Texty a tlačítka odpovídají skutečnému stavu vývoje.

### Priorita 2 — Dokončit kontakt a příjem zájmu

Doplnit provozovatele a skutečný kontakt. Poté připojit formulář na serverovou službu pro příjem poptávek, doplnit serverovou validaci, ochranu proti spamu a jasné stavy úspěchu i chyby. Určit, jak dlouho a kde se údaje uchovávají, a zveřejnit odpovídající informace o jejich zpracování.

**Výsledek:** testovací poptávka dorazí příjemci a návštěvník má pravdivé potvrzení o výsledku odeslání.

### Priorita 3 — Ověřit uživatelský zážitek

Projít hlavní stránku i průvodce na mobilu a počítači. Ověřit oba motivy, menu, klávesnici, záložky, formulář, kopírování a stažení. Zkontrolovat kontrast, čitelnost, přetékání obsahu a načítání obrázků. Změřit výkon v prohlížeči.

**Výsledek:** hlavní cesta návštěvníka je použitelná na běžných velikostech obrazovky a zjištěné chyby jsou opravené.

### Priorita 4 — Připravit a provést veřejné nasazení

Zvolit hosting, nastavit `qualio.cz`, HTTPS a jednotnou podobu domény. Před nahráním obnovit generované soubory a spustit kontroly. U statického hostingu samostatně nastavit přesměrování a chybové odpovědi; logika Node serveru se samotným nahráním HTML nepřenese.

Pro statické nasazení jsou určeny `index.html`, `vyber-systemu-kvality.html`, `style.css`, `app.js`, `robots.txt`, `sitemap.xml`, `assets/favicon.svg` a `assets/inspection.jpg`. Vývojové soubory, konfigurace a návrhy nejsou určeny k veřejnému vystavení.

**Výsledek:** obě veřejné stránky odpovídají stavem 200, mají správný canonical a povolenou produkční indexaci; neznámé adresy vracejí 404.

### Priorita 5 — Ověřit dohledatelnost a začít měřit

Ověřit vlastnictví domény v Google Search Console a Bing Webmaster Tools, předat sitemapu a zkontrolovat indexaci. Ověřit, že hosting neblokuje vyhledávací roboty. Určit, co se má měřit jako konverze, a následně zavést odpovídající analytiku.

Obsah dále rozšiřovat o vlastní zkušenosti z vývoje, skutečné produktové ukázky a později doložené případové studie. Označení „ve vývoji“ měnit až podle skutečné dostupnosti produktu.

**Výsledek:** lze sledovat návštěvnost, zájem o produkt a nalezené problémy; doporučení AI zůstává výsledkem nezávislých systémů.

### Priorita 6 — Odděleně naplánovat první verzi QMS aplikace

Pokud má následovat vývoj samotného produktu, navrhnout datový model, role uživatelů a jeden kompletní pilotní proces: kontrolní plán → měření → neshoda → opatření → ověření účinnosti. Na něm ověřit práci s daty, historií změn a oprávněními. Teprve poté rozšiřovat další moduly a integrace.

**Výsledek:** funkční pilot s reálnými požadavky a ověřenou návazností kroků. Tento vývoj je samostatná část projektu nad rámec současného prezentačního webu.
