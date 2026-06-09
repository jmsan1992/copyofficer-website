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

**A medias / roto:**
- ⚠️ **Los emails NO se disparan desde la función de Vercel.** Al enviar el form, Airtable se guarda pero el contacto NO se crea en Loops y no llegan emails. La API de Loops funciona perfecto en pruebas directas (curl) → el problema es que **`LOOPS_API_KEY` no está llegando al código en ejecución** (la condición `if (LOOPS_API_KEY && ...)` sale falsa). La var SÍ aparece en el dashboard de Vercel (Production+Preview, añadida ~7h).

**Dudas abiertas:**
- ¿El deployment que sirve el form se construyó después de añadir `LOOPS_API_KEY`? ¿O las pruebas se hicieron antes de que terminara el deploy?
- ¿El form de producción (www.copyofficer.com) apunta al mismo deployment que probé por curl (`copyofficer-website.vercel.app`)?

### 6. Próximos pasos (por prioridad)

1. **[BLOQUEANTE] Arreglar que Loops dispare desde Vercel.**
   - Re-añadir temporalmente el campo debug en la respuesta: `return res.status(200).json({ ok: true, loopsKeySet: !!LOOPS_API_KEY })`.
   - Commit + push, **esperar a que el deploy termine** (verificar en Vercel → Deployments que el commit está "Ready"), y solo entonces hacer `curl -X POST .../api/submit-lead`.
   - Si `loopsKeySet:false` → la env var no llega: revisar que el deploy de producción es posterior a la creación de la var; forzar "Redeploy" SIN usar caché de build; confirmar scope Production.
   - Si `loopsKeySet:true` pero el contacto no se crea → loguear el resultado de los `fetch` a Loops (status + body) dentro de `Promise.allSettled` para ver el error real de la API.
   - Verificar tras cada intento: `curl "https://app.loops.so/api/v1/contacts/find?email=<test>" -H "Authorization: Bearer <LOOPS_API_KEY>"`.
   - Al terminar, **quitar el debug**.
2. **Limpiar:** borrar `netlify/functions/submit-lead.js` (huérfano) y el directorio `netlify/` si queda vacío.
3. **Test end-to-end real:** rellenar el form en el sitio con un email real → confirmar que llegan los DOS emails (confirmación al lead + notificación a Jose) y el registro a Airtable.
4. **Conectar Calendly al CRM:** hoy el form va a Airtable, pero las reservas de Calendly no. Añadir webhook de Calendly → Airtable (vía otra función de Vercel o la integración nativa).
5. **Nurturing en Loops:** secuencia de follow-ups (día 0/2/5/10) con ramas por comportamiento. Requiere escribir los emails primero.
6. **Reporting:** Looker Studio con GA4 + Google Ads (conectores nativos) + Airtable (vía Google Apps Script gratis, NO Coupler.io). El usuario está terminando conversion tracking y Google Ads.
7. **Visión a largo plazo (roadmap del usuario):** ir añadiendo "capas" hasta un sistema casi-autónomo. Próxima capa de valor: **agente de research competitivo** (lee la web del lead → identifica industria/competidores/oportunidad hispana → genera brief antes de la llamada). Viviría en la misma infra (`/api/research-lead.js` + Claude API). Construir solo cuando haya volumen de leads que lo justifique.

### 7. Notas de trabajo

- Browser de Playwright = sesión propia aislada (no comparte cookies con el Chrome del usuario). El usuario debe loguearse dentro de ese browser; puede abrir pestañas y dejar sesiones activas (lo hizo con Vercel, Bluehost, Loops, Airtable).
- Viewport de Playwright a 1280x800 hace el editor de Loops usable; más pequeño rompe el layout.
- El usuario NO es técnico: explicar en lenguaje simple sin jerga, y pedirle que haga manualmente los pasos de editores visuales.
