# CopyOfficer — Contexto del Proyecto

## Qué es este proyecto

Landing page principal de **CopyOfficer**, una agencia que diseña e implementa sistemas de adquisición de clientes hispanos para marcas estadounidenses en real estate, healthcare, servicios financieros, retail/e-commerce y SaaS.

Propuesta de valor central: "Hispanic Acquisition Architecture" — sistema de 6 partes para entender, adquirir y escalar clientes hispanos de forma sistemática.

## Tecnología

- HTML/CSS/JS puro — sin frameworks ni bundler
- **Hosting: Vercel** (proyecto `copyofficer-website`, team `joses-projects-e57288c3`). Push a `main` en GitHub `jmsan1992/copyofficer-website` = deploy automático. (Históricamente se probó Netlify; el sitio en producción está en Vercel.)
- **Backend: Vercel Serverless Functions** en `/api/`. `api/submit-lead.js` recibe los forms y los envía a Airtable + Loops. Las credenciales viven en Vercel → Environment Variables (`AIRTABLE_TOKEN`, `LOOPS_API_KEY`), NUNCA en el código (GitHub bloquea secrets y `forms.js` es público).
- **CRM: Airtable** — base `appPLCdGWMfpyDs8A`, tabla `tblVVv9Gou91CZOeH` ("CopyOfficer - CRM").
- **Email: Loops** — dominio de envío `copyofficer.com` verificado (From `jose@copyofficer.com`, Reply-To `jose@fractionalglobalcmo.com`). Transactionals: confirmación al lead `cmq67hi46063f0jy6daqoo0ku`, notificación a Jose `cmq6gk8s21o1a0jzhfivv4djo`. DNS de Loops gestionado en **Bluehost**.
- **Google Tag Manager** (GTM-TJ99WQLT) instalado en `<head>` y `<body>`
- Fuentes: `Flechatest` (serif custom, fallback Times New Roman) + Inter via Google Fonts
- Scroll reveal animado con IntersectionObserver (clase `.reveal` / `.visible`)
- `forms.js` — lógica de formulario; hace `POST` a `/api/submit-lead` (ya NO usa Make)
- Calendly para booking: `https://calendly.com/jmsan1992/quick-discovery-call`

## Notas de colaboración

- El usuario NO es técnico: explicar en lenguaje simple, sin jerga.
- Tareas en editores visuales (Loops, dashboards): es más rápido y barato que las haga el usuario manualmente. Pedírselo en vez de automatizar con Playwright.
- Variables de Loops: insertar siempre con el botón `{}` del editor (escribirlas a mano produce el bug de llave suelta `{Jose`).
- Ver `SESSION_LOG.md` para el estado de trabajo en curso y próximos pasos.

## Estructura de archivos

```
CopyOfficer/
├── index.html                      # Landing page principal
├── forms.js                        # Lógica del formulario de contacto
├── images/
│   ├── logocopyofficer2.png        # Logo usado en el header
│   └── logocopyofficer.png / .jpeg
├── hispanics/                      # Assets visuales del mercado hispano
│   ├── h1.jpeg – h6.jpeg
│   ├── videohero.mp4
│   └── videosection.mp4
├── lp-hispanic-growth/
│   └── index.html                  # Landing page alternativa / campaña
└── Context/
    └── copyofficercontext.pdf      # Documento de contexto estratégico
```

## Paleta de colores

```css
--bg:         #F7F2EA   /* crema cálido — fondo principal */
--bg-cream:   #EDE5D6
--text:       #1A1614   /* casi negro */
--text-mid:   #3D3330
--text-muted: #6B5F59
--terracotta: #C2492C   /* acento principal — CTAs, highlights */
--terra-dark: #A33A20
--moss:       #3D5240   /* acento secundario — cards, rules */
--gold:       #C8941A
```

## Secciones del sitio (en orden)

| Sección               | Descripción |
|-----------------------|-------------|
| Header/Nav            | Logo + CTA "Book a Call" (Calendly) |
| Hero                  | Imagen de fondo, headline principal, cards problema/solución, CTAs |
| The Opportunity       | Statement de impacto: "20-40% revenue lost" |
| Photo Band 1          | Foto `h1.jpeg` |
| The Category          | Grid de 6 componentes del Hispanic Acquisition System |
| How We Work           | 3 etapas: Strategy → Build → Growth |
| Photo Band 2          | Foto `h2.jpeg` |
| Verticals             | 5 industrias: Real Estate, Healthcare, Financial Services, Retail, SaaS |
| Final CTA (`#report`) | Formulario Netlify (nombre, email, website, mensaje) |
| Footer                | Tagline, geo coverage, navegación |

## Sistema de 6 componentes (solución principal)

1. **Understand** — Research del comprador hispano (JTBD, psicología, segmentación)
2. **Design** — Customer journey adaptado al comportamiento de compra hispano
3. **Build** — Assets de conversión (landing pages, contenido, CRM, nurturing)
4. **Measure** — Tracking e analytics (GA4, GTM, atribución)
5. **Acquire** — Campañas en canales donde está el público hispano (paid media, search, social)
6. **Optimize** — Análisis continuo, CRO, testing e iteración

## Geografía objetivo

Los Angeles · Houston · Miami · Dallas · Phoenix · San Antonio · Chicago · NYC · Riverside · Orlando

## Notas de diseño

- Estética: editorial cálida — fondo crema, terracotta como acento, tipografía serif bold para headlines.
- Secciones alternan entre `--bg` y `--bg-cream`; la sección "Category" usa fondo oscuro (`--text` = #1A1614) para contraste.
- `photo-band`: divisores visuales entre secciones a 380px de alto con filtro `saturate(0.8) contrast(1.05) brightness(0.92)`.
- Scroll reveal: IntersectionObserver en elementos `.reveal`; delays escalonados con `.reveal-delay-1` a `.reveal-delay-4`.
- Responsive: breakpoints en 1100px, 860px, 640px y 540px.

## Convenciones de código

- CSS inline en `<style>` dentro del `<head>`, organizado por sección con comentarios `/* ── SECTION NAME ── */`.
- JS mínimo al final del `<body>`: solo scroll reveal + `forms.js` externo.
- Clases semánticas por componente (ej. `.product-card`, `.vertical-card`, `.component`).
- Botones: `.btn-primary` (terracotta), `.btn-outline` (sobre fondos oscuros), `.btn-outline-dark` (sobre fondos claros), `.btn-link` (moss).
