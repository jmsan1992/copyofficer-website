# Session Log — CopyOfficer

> Registro de continuidad entre sesiones. La entrada más reciente va arriba.
> Cada entrada debe permitir retomar el trabajo en frío, sin contexto previo.

---

## 2026-06-09 — Migración Make → Vercel + integración Loops (emails automáticos)

### 1. Contexto del proyecto

- **Qué es:** Landing page de CopyOfficer (agencia de adquisición de clientes hispanos). HTML/CSS/JS puro.
- **Hosting real:** **Vercel** (proyecto `copyofficer-website`, team `joses-projects-e57288c3`). El CLAUDE.md decía Netlify pero el sitio en producción está en **Vercel**.
- **Repo:** GitHub `jmsan1992/copyofficer-website`, rama `main`. Push a `main` = deploy automático en Vercel.
- **Dominios:** `copyofficer.com` (producción) + `copyofficer-website.vercel.app`. DNS gestionado en **Bluehost** (nameservers ns1/ns2.bluehost.com); registrador Network Solutions. En Vercel el dominio aparece como "Third Party".
- **Objetivo de esta fase:** convertir el sitio en un sistema de captación automatizado: form → CRM + emails automáticos, sin intervención manual y sin depender de Make.

### 2. Decisiones clave (con razón)

| Decisión | Razón |
|----------|-------|
| **Eliminar Make** como intermediario del form | Una pieza menos, gratis, y control total. Antes: form → webhook Make → Airtable. |
| **Vercel Serverless Function** (`/api/submit-lead.js`) como backend | El sitio ya está en Vercel. El token de Airtable/Loops vive en variables de entorno del servidor, nunca en el código público (GitHub bloquea secrets en push, y `forms.js` es visible en el navegador). |
| Se descartó meter el token de Airtable directo en `forms.js` | GitHub push protection lo bloqueó + sería visible públicamente. |
| Se creó primero `netlify/functions/submit-lead.js` y luego se abandonó | Se descubrió que el hosting es Vercel, no Netlify. **Ese archivo quedó huérfano — se puede borrar.** |
| **Loops** como plataforma única de email (confirmación + nurturing futuro) | Una sola herramienta para email inmediato y secuencias. Free tier 2.000 contactos. |
| **From:** `jose@copyofficer.com`, **Reply-To:** `jose@fractionalglobalcmo.com` | No hace falta comprar buzón en copyofficer.com; los DNS autorizan a Loops/SES a enviar en nombre del dominio. Las respuestas caen en el email real de agencia. |
| Variables de Loops (`{{firstName}}`) deben insertarse con el botón `{}` del editor, NO escritas a mano | Escribirlas como texto literal produce el bug `{Jose` (una llave suelta). El nodo-variable real sí funciona. |
| Tareas en editores visuales (Loops, etc.) las hace el usuario manualmente | Más rápido y ahorra tokens. Playwright sobre el editor Lexical de Loops es frágil. **Preferencia del usuario confirmada.** |

### 3. Cambios realizados (archivos)

- **`forms.js`** (modificado): antes enviaba al webhook de Make; ahora hace `POST` a `/api/submit-lead` con todos los campos (name, email, phone, company, website, message, UTMs, entry_page). Sigue capturando y persistiendo UTMs en `sessionStorage`. Sirve a los dos forms (homepage y `lp-hispanic-growth/`).
- **`api/submit-lead.js`** (creado): función serverless. Hace, en orden:
  1. Guarda el lead en **Airtable** (base `appPLCdGWMfpyDs8A`, tabla `tblVVv9Gou91CZOeH`).
  2. Si hay `LOOPS_API_KEY`: en paralelo (`Promise.allSettled`) → crea/actualiza contacto en Loops + envía email de confirmación al lead (transactional `cmq67hi46063f0jy6daqoo0ku`, variable `firstName`) + envía notificación a `jose@fractionalglobalcmo.com` (transactional `cmq6gk8s21o1a0jzhfivv4djo`, variables `leadName/leadEmail/leadCompany/leadWebsite/leadMessage/leadSource/leadPage`).
- **`netlify/functions/submit-lead.js`** (creado y ABANDONADO): vestigio del intento Netlify. **Borrar.**
- **`index.html`** y **`lp-hispanic-growth/index.html`** (modificados): CTAs "Tell Us More" → "Send Message".

### 4. Identificadores y recursos (sin secretos)

- **Airtable:** base `appPLCdGWMfpyDs8A`, tabla `tblVVv9Gou91CZOeH` (nombre visible "CopyOfficer - CRM"). Campos: Name, Email, Phone, Company, Website, Message, Source, Entry Page, Entry Point, Created At (auto), Last Contacted, UTM Source/Medium/Campaign/Content/Term, Status, Campaign, Notes.
- **Loops sending domain:** `cmq5hbrgz06wq0jzrgy8pfdol` (copyofficer.com) → **DNS verificado ✅** (MX, SPF, DMARC, 3x DKIM, loops-verification añadidos en Bluehost).
- **Loops transactional — confirmación al lead:** `cmq67hi46063f0jy6daqoo0ku` (publicado; saludo personalizado `firstName` + link Calendly).
- **Loops transactional — notificación a Jose:** `cmq6gk8s21o1a0jzhfivv4djo` (subject "New lead: {{leadName}}" + body con todos los campos).
- **Calendly:** `https://calendly.com/jmsan1992/quick-discovery-call`
- **Vercel env vars (Production + Preview):** `AIRTABLE_TOKEN` ✅ funciona, `LOOPS_API_KEY` ⚠️ ver problema abierto. (Los valores reales viven SOLO en Vercel, nunca en el repo.)

### 5. Estado actual

**Funciona:**
- ✅ Form (homepage + landing) → Airtable. Verificado: los registros aparecen.
- ✅ Dominio verificado en Loops; se puede enviar desde `jose@copyofficer.com`.
- ✅ Email de confirmación al lead (probado vía API directa con `firstName` → llega con `Hi Jose,` correcto tras arreglar el bug de la llave).
- ✅ Ambos emails transaccionales creados y publicados en Loops.
- ✅ **Captura de click-ids (Google Ads `gclid` + Meta `fbclid`)** en ambos forms. Cadena: anuncio con `?gclid/?fbclid` → **tag de GTM (publicado, fire en all pages) crea las cookies** `gclid`/`fbclid` → `forms.js` las lee (al cargar y, clave, **otra vez antes de enviar**, así no importa el timing de GTM) → rellena campos ocultos → payload → `api/submit-lead.js` las guarda en columnas Airtable `GCLID`/`FBCLID` (creadas por el usuario). **Verificado end-to-end**: visitar `?gclid=PRUEBA123&fbclid=PRUEBA456` + enviar form → valores aparecen en Airtable. (Nota: cookies deben llamarse exactamente `gclid`/`fbclid`, minúsculas; `forms.js` las lee por ese nombre.)

- ✅ **RESUELTO: los emails de Loops ya se disparan desde Vercel.**
  - **Causa raíz:** la variable `LOOPS_API_KEY` existía en Vercel con el nombre correcto y scope Production, pero **su VALOR estaba vacío** (longitud 0). El nombre era exacto (no había typo ni espacio) y `AIRTABLE_TOKEN` funcionaba — el problema era solo el valor en blanco. Por eso `if (LOOPS_API_KEY && ...)` salía falso y las llamadas a Loops ni se intentaban, sin error visible.
  - **Cómo se diagnosticó:** se instrumentó la función temporalmente para devolver `loopsKeySet`/`loopsKeyLen` y `Object.keys(process.env)` filtrado por `/loop/`. Resultado: `loopsEnvKeys:["LOOPS_API_KEY"]` (nombre OK) + `loopsKeyLen:0` (valor vacío) → diagnóstico inequívoco.
  - **Fix:** el usuario re-pegó el valor de la API key en Vercel → Save (Production) → Redeploy.
  - **Verificado en producción:** `loopsKeySet:true, loopsKeyLen:32`; las 3 llamadas a Loops responden `confirm 200`, `notify 200`, `contact 409` (409 = contacto ya existía, inofensivo). Los dos emails se envían correctamente.
  - **Lección / prevención:** el código original tragaba los errores de Loops en silencio (`Promise.allSettled` sin chequear `.ok` ni loguear). Se dejó un `console.error` ante cualquier respuesta no-2xx de Loops (igual que el manejo de Airtable) para que un fallo futuro sea visible en los logs de Vercel.

- ✅ **RESUELTO: el email de notificación llegaba vacío y luego no llegaba.** Dos sub-bugs encadenados, ambos en la plantilla de Loops (no en el código):
  1. **Cuerpo vacío:** el texto del cuerpo estaba en un color claro → invisible sobre el fondo claro de Gmail ("rectángulo gris vacío"). El editor de Loops lo mostraba bien porque estaba en preview "Dark mode". Fix: poner el color del texto en negro.
  2. **No enviaba (tras arreglar el color):** al reconstruir el bloque, la variable de empresa quedó como **`leadCompa`** (recortada) en vez de `leadCompany`. El código manda `leadCompany`, la plantilla exigía `leadCompa` → Loops respondía **400 "Missing required data variable(s): leadCompa"** y no enviaba. Fix: corregir la variable a `leadCompany` en la plantilla + Publish.

**Reglas de Loops aprendidas (importantes para futuras plantillas):**
- Loops exige que el envío incluya una clave por **cada** variable que la plantilla declara, con el **nombre exacto** — el VALOR puede ir vacío, pero la CLAVE debe existir. Un nombre que no coincide = error 400, no se envía.
- **"Send preview" NO valida las variables** (usa datos de ejemplo) → puede funcionar en preview y fallar en el envío real. Para verificar de verdad, hacer un envío real.
- El código manda los 7 nombres: `leadName, leadEmail, leadCompany, leadWebsite, leadMessage, leadSource, leadPage`, y rellena los vacíos con `—`, así que el email **siempre se envía con lo que el lead haya puesto** (campos vacíos salen como `—`). Si se editan plantillas, los nombres deben seguir coincidiendo con esos 7.
- Loops manda un email automático "nuevo contacto añadido a la audiencia" por cada `contacts/create`. Es ruido; se silencia en Loops → Settings → Notifications. (El contacto SÍ queremos crearlo, para nurturing futuro.)

**Notas de operación de Vercel (aprendidas esta sesión):**
- Un cambio de VALOR de una env var NO se aplica a deploys existentes: hay que **redeploy** para que lo recoja.
- "Redeploy" sobre un deployment viejo de la lista reconstruye ESE commit (no el último). Si se quiere el último código, hacer push o redeploy del deployment más reciente.
- `www.copyofficer.com` es el dominio que sirve la función; `copyofficer.com` (sin www) hace **307 redirect** a www. Para probar por curl, usar directamente `https://www.copyofficer.com/api/submit-lead`.
- El campo `Source` (y probablemente `Entry Page`) en Airtable rechaza valores fuera de su lista si es single-select: en pruebas usar valores válidos (`direct`, `homepage`).

### 6. Próximos pasos (por prioridad)

1. ~~**[BLOQUEANTE] Arreglar que Loops dispare desde Vercel.**~~ ✅ **HECHO** (ver sección 5: el valor de `LOOPS_API_KEY` estaba vacío en Vercel; arreglado y verificado en producción; debug ya retirado, código limpio en commit `a8487df`).
2. **Limpiar:**
   - ⬜ **Pendiente (manual en Airtable):** borrar todas las filas de prueba que empiezan por **"ZZZ DEBUG TEST"** (del diagnóstico de Loops y de la prueba de gclid/fbclid; varias, algunas con email en blanco). Las de gclid llevan `GCLID=test-gclid-OK-123` / `FBCLID=test-fbclid-OK-456`.
   - ✅ **HECHO:** borrado `netlify/functions/submit-lead.js` (huérfano) y el directorio `netlify/` (commit `03a5b7b`).
3. **Test end-to-end real:** rellenar el form en el sitio con un email real → confirmar que llegan los DOS emails (confirmación al lead + notificación a Jose) y el registro a Airtable.
4. **Conectar Calendly al CRM:** hoy el form va a Airtable, pero las reservas de Calendly no. Añadir webhook de Calendly → Airtable (vía otra función de Vercel o la integración nativa).
5. **Nurturing en Loops:** secuencia de follow-ups (día 0/2/5/10) con ramas por comportamiento. Requiere escribir los emails primero.
6. **Reporting:** Looker Studio con GA4 + Google Ads (conectores nativos) + Airtable (vía Google Apps Script gratis, NO Coupler.io). El usuario está terminando conversion tracking y Google Ads.
7. **Visión a largo plazo (roadmap del usuario):** ir añadiendo "capas" hasta un sistema casi-autónomo. Próxima capa de valor: **agente de research competitivo** (lee la web del lead → identifica industria/competidores/oportunidad hispana → genera brief antes de la llamada). Viviría en la misma infra (`/api/research-lead.js` + Claude API). Construir solo cuando haya volumen de leads que lo justifique.

### 7. Notas de trabajo

- Browser de Playwright = sesión propia aislada (no comparte cookies con el Chrome del usuario). El usuario debe loguearse dentro de ese browser; puede abrir pestañas y dejar sesiones activas (lo hizo con Vercel, Bluehost, Loops, Airtable).
- Viewport de Playwright a 1280x800 hace el editor de Loops usable; más pequeño rompe el layout.
- El usuario NO es técnico: explicar en lenguaje simple sin jerga, y pedirle que haga manualmente los pasos de editores visuales.
