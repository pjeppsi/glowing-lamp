# Fitness Challenge — Design Handoff

Referentni dokument za developere: design tokeni, tipografija, ikonografija i UI pravila korištena u aplikaciji. Sve vrijednosti su izvučene iz postojećeg koda (`src/styles.scss` i komponente) — ovo je izvor istine, ne dupliciraj vrijednosti hardkodirano po komponentama, uvijek referenciraj CSS custom properties.

## 1. Tema

- Tamna tema (`theme-type: dark`) na bazi Angular Material 3 (`@angular/material` theming API).
- Primarna paleta: **Violet** (`mat.$violet-palette`).
- Font: **Inter** (300–800), učitan preko Google Fonts u `index.html`.
- Nema light theme varijante trenutno — ako se dodaje, potrebno je proširiti `:root` tokene s `[data-theme="light"]` override-om.

## 2. Design tokeni (CSS custom properties)

Svi tokeni definirani su u `src/styles.scss` pod `:root`. **Uvijek koristi ove varijable**, nikad hardkodirane hex vrijednosti u komponentama.

### Boje — pozadine i površine
| Token | Vrijednost | Upotreba |
|---|---|---|
| `--fc-bg` | `#09090d` | Pozadina cijele app-shell |
| `--fc-surface` | `#111116` | Sidebar, navbar |
| `--fc-card` | `#16161e` | Kartice (`mat-mdc-card`) |
| `--fc-card-hover` | `#1c1c26` | Hover state kartica |
| `--fc-border` | `rgba(255,255,255,0.07)` | Standardni border/divider |
| `--fc-border-focus` | `rgba(139,92,246,0.5)` | Focus outline |

### Boje — tekst
| Token | Vrijednost | Upotreba |
|---|---|---|
| `--fc-text-primary` | `#f4f4f8` | Naslovi, primarni sadržaj |
| `--fc-text-secondary` | `#8b8ba8` | Sekundarni tekst, labele |
| `--fc-text-muted` | `#55556a` | Meta info, placeholderi, timestampi |

### Boje — accent i semantika
| Token | Vrijednost | Upotreba |
|---|---|---|
| `--fc-accent` | `#8b5cf6` | Primarna akcija (dugmad, aktivni linkovi) |
| `--fc-accent-light` | `#a78bfa` | Hover/aktivni accent, ikone |
| `--fc-accent-dim` | `rgba(139,92,246,0.12)` | Pozadina aktivnog nav itema, badge pozadine |
| `--fc-green` | `#10b981` | Pozitivno / trend gore / uspjeh |
| `--fc-red` | `#ef4444` | Greška / trend dolje / destruktivno |
| `--fc-amber` | `#f59e0b` | Upozorenje / neutralno-istaknuto |
| `--fc-blue` | `#3b82f6` | Informativno (rezervirano, koristiti štedljivo) |

**Pravilo semantike boja (ne mijenjati bez razloga):**
- `trend-up` → `--fc-green`, `trend-down` → `--fc-red`, `trend-same` → `--fc-text-muted`, `trend-new` → `--fc-amber` (vidi `.trend-*` klase u `styles.scss`).
- Statistički karticu ikone koriste tri fiksne varijante pozadine: `--purple` (accent-dim), `--green`, `--amber` — vidi `.stat-icon-wrap` u `dashboard.scss` kao referentni pattern za nove stat kartice.

### Radius
| Token | Vrijednost |
|---|---|
| `--fc-radius-sm` | `8px` — sitni elementi (nav item, user card, logo) |
| `--fc-radius` | `12px` — kartice, standardni kontejneri |
| `--fc-radius-lg` | `16px` |
| `--fc-radius-xl` | `24px` |

### Sjene
| Token | Vrijednost |
|---|---|
| `--fc-shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` |
| `--fc-shadow` | `0 4px 16px rgba(0,0,0,0.5)` — default za kartice |
| `--fc-shadow-lg` | `0 8px 32px rgba(0,0,0,0.6)` |

### Layout
| Token | Vrijednost |
|---|---|
| `--fc-sidebar-w` | `240px` |

## 3. Tipografija

Font family: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`.

| Kontekst | Veličina | Weight | Letter-spacing | Napomena |
|---|---|---|---|---|
| Page title (`h1`) | `1.4–1.5rem` | 700 | `-0.02em` | uvijek s ikonom pored teksta (`gap: 8–10px`) |
| Stat value | `1.75rem` | 800 | `-0.03em` | `font-variant-numeric: tabular-nums` — obavezno za brojke koje se mijenjaju |
| Stat label | `0.75rem` | 500 | `0.06em` | `text-transform: uppercase` |
| Card title (chart/recent) | `0.9rem` | 600 | — | boja `--fc-text-secondary` |
| Nav section label | `0.65rem` | 600 | `0.1em` | uppercase |
| Nav item | `0.875rem` | 500 | — | |
| Body / row text | `0.875rem` | 400–500 | — | |
| Meta / date / muted | `0.7–0.75rem` | 400 | — | boja `--fc-text-muted` |

Pravilo: uppercase + letter-spacing kombinacija (`0.06–0.1em`) rezervirana je isključivo za labele/meta tekst malog fonta, nikad za naslove ili tijelo teksta.

## 4. Ikonografija

- Icon set: **Material Icons** (ligature font, učitan u `index.html` preko `fonts.googleapis.com/icon?family=Material+Icons`).
- Komponenta: Angular Material `<mat-icon>ime_ikone</mat-icon>` (ligature naziv kao text content, ne SVG).
- **Ne miješati icon setove** (npr. Material Symbols, Font Awesome, custom SVG) — sve ikone moraju biti iz Material Icons kataloga radi vizualne konzistentnosti (isti stroke weight/grid).

### Standardne veličine ikona
| Kontekst | Veličina |
|---|---|
| Logo (sidebar) | `18×18px` |
| Nav item | `18×18px` |
| Logout button | `16×16px` |
| Page header (h1) | `22×22px` |
| Stat card icon-wrap | `22×22px` unutar `44×44px` kruga/kvadrata (`border-radius: 10px`) |

### Trenutno korištene ikone (katalog po značenju — koristi ove iste za isti koncept, ne izmišljaj nove sinonime)
| Ikona | Značenje |
|---|---|
| `bolt` | Brend/logo (app identitet) |
| `leaderboard` | Leaderboard sekcija |
| `bar_chart` | Dashboard/statistika nav |
| `dashboard` | Dashboard page header |
| `directions_run` | Aktivnost/sport |
| `emoji_events` | Nagrade/pobjede |
| `star` | Istaknuto/rating |
| `refresh` | Manualni refresh podataka |
| `error_outline` | Error state |
| `logout` | Odjava |
| `visibility` / `visibility_off` | Prikaz/skrivanje lozinke |
| `arrow_upward` / `arrow_downward` (trend) | Trend gore/dolje u leaderboardu (obojano `trend-up`/`trend-down`) |

Kad je potrebna nova ikona, prvo provjeri postoji li već korišten koncept u tablici iznad prije uvođenja nove — cilj je minimalan, dosljedan skup ikona kroz app.

## 5. Komponente — pravila

- **Kartice**: uvijek `mat-mdc-card` s override-ima iz `styles.scss` (`--fc-card` pozadina, `--fc-border`, `--fc-radius`, `--fc-shadow`). Ne stilizirati custom `<div class="card">` — koristiti Material card.
- **Tablice**: `mat-mdc-table`, header uppercase `--fc-text-muted`, redovi s `--fc-border` divider i suptilni hover (`rgba(255,255,255,0.03)`), zadnji red bez border-a.
- **Forme**: Reactive Forms obavezno (v. CLAUDE.md). Outline border koristi `--fc-border`, focus state `--fc-accent`.
- **Primarni gumb**: `mat-raised-button` + `mat-primary` → pozadina `--fc-accent`, hover `--fc-accent-light` + glow shadow (`0 0 20px rgba(139,92,246,0.35)`). Ne dodavati dodatne custom button stilove za primarnu akciju.
- **Snackbar**: uspjeh → `success-snack` (`#064e3b` bg / `#065f46` border), greška → `error-snack` (`#450a0a` bg / `#7f1d1d` border).
- **Page layout**: svaka feature stranica koristi `.page-container` (max-width `1100px`, centriran, `32px 24px` padding) i `.page-header` (flex, space-between, `h1` s ikonom).
- **Loading/error state**: `.loading-state` / `.error-state` — centriran flex column, `gap: 16px`, `padding: 80px 0`, tekst `--fc-text-secondary`.
- **Empty state**: centriran tekst, `--fc-text-muted`, `padding: 40px`, `0.875rem`.

## 6. Pristupačnost (obavezno, iz CLAUDE.md)

- Sav novi UI mora proći **AXE** provjere i zadovoljiti **WCAG AA** minimume.
- Provjeriti kontrast: `--fc-text-muted` (`#55556a`) na `--fc-bg`/`--fc-card` je granični slučaj — koristiti isključivo za sekundarne/meta informacije, nikad za jedini nosilac bitne informacije ili interaktivni label.
- Fokus stanje mora biti vizualno vidljivo (`--fc-border-focus` / `--fc-accent`) na svim interaktivnim elementima — ne uklanjati `outline` bez zamjene.
- Ikone koje nose značenje bez pratećeg teksta (npr. trend strelice, logout) moraju imati `[attr.title]` ili `aria-label`.
- Boja se nikad ne koristi kao jedini nosilac informacije (npr. trend up/down mora imati i ikonu smjera, ne samo boju).

## 7. Kako dodati novi UI element

1. Provjeri postoji li već token/pattern u ovom dokumentu prije uvođenja nove boje, radiusa ili veličine fonta.
2. Nove boje/tokene dodaj u `:root` u `src/styles.scss`, imenuj po konvenciji `--fc-<namn>`.
3. Ikone biraj isključivo iz Material Icons, po mogućnosti iz postojećeg kataloga (sekcija 4).
4. Komponentu piši kao standalone Angular komponentu prema pravilima u `.claude/CLAUDE.md` (signals, `OnPush`, `input()`/`output()`, native control flow, Reactive Forms).
5. Testiraj AXE + tipkovnički fokus prije predaje na review.
