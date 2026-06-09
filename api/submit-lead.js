const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || 'appPLCdGWMfpyDs8A';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'tblVVv9Gou91CZOeH';
const AIRTABLE_URL   = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

const LOOPS_API_KEY              = process.env.LOOPS_API_KEY;
const LOOPS_CONFIRMATION_ID      = 'cmq67hi46063f0jy6daqoo0ku';
const LOOPS_NOTIFICATION_ID      = 'cmq6gk8s21o1a0jzhfivv4djo';
const NOTIFICATION_EMAIL         = 'jose@fractionalglobalcmo.com';

function getFirstName(fullName) {
  return (fullName || '').split(' ')[0] || fullName || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const body = req.body;
  const first = getFirstName(body.name);

  // 1. Save to Airtable
  const airtableRes = await fetch(AIRTABLE_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      records: [{
        fields: {
          'Name':         body.name         || '',
          'Email':        body.email        || '',
          'Phone':        body.phone        || '',
          'Company':      body.company      || '',
          'Website':      body.website      || '',
          'Message':      body.message      || '',
          'Source':       body.source       || 'direct',
          'Entry Page':   body.entry_page   || '',
          'Entry Point':  'contact_form',
          'UTM Source':   body.utm_source   || '',
          'UTM Medium':   body.utm_medium   || '',
          'UTM Campaign': body.utm_campaign || '',
          'UTM Content':  body.utm_content  || '',
          'UTM Term':     body.utm_term     || '',
        },
      }],
    }),
  });

  if (!airtableRes.ok) {
    console.error('[submit-lead] Airtable error:', await airtableRes.text());
    return res.status(502).json({ error: 'Airtable error' });
  }

  // 2. Loops: confirm to lead + notify Jose
  // --- DEBUG TEMPORAL: quitar tras diagnosticar el problema de Loops ---
  const debug = {
    loopsKeySet:    !!LOOPS_API_KEY,
    loopsKeyLen:    (LOOPS_API_KEY || '').length,
    loopsEnvKeys:   Object.keys(process.env).filter((k) => /loop/i.test(k)),
    airtableKeySet: !!process.env.AIRTABLE_TOKEN,
    hasEmail:       !!body.email,
    loops:          [],
  };

  if (LOOPS_API_KEY && body.email) {

    const calls = [
      ['contact', 'https://app.loops.so/api/v1/contacts/create', {
        email:     body.email,
        firstName: first,
        lastName:  (body.name || '').split(' ').slice(1).join(' '),
        source:    body.source || 'contact_form',
      }],
      ['confirm', 'https://app.loops.so/api/v1/transactional', {
        transactionalId: LOOPS_CONFIRMATION_ID,
        email:           body.email,
        dataVariables:   { firstName: first },
      }],
      ['notify', 'https://app.loops.so/api/v1/transactional', {
        transactionalId: LOOPS_NOTIFICATION_ID,
        email:           NOTIFICATION_EMAIL,
        dataVariables: {
          leadName:    body.name      || '—',
          leadEmail:   body.email     || '—',
          leadCompany: body.company   || '—',
          leadWebsite: body.website   || '—',
          leadMessage: body.message   || '—',
          leadSource:  body.source    || 'direct',
          leadPage:    body.entry_page || '—',
        },
      }],
    ];

    const results = await Promise.allSettled(
      calls.map(([label, url, payload]) =>
        fetch(url, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${LOOPS_API_KEY}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        }).then(async (r) => ({ label, status: r.status, body: await r.text() }))
      )
    );

    debug.loops = results.map((res, i) =>
      res.status === 'fulfilled' ? res.value : { label: calls[i][0], error: String(res.reason) }
    );
    console.log('[submit-lead] loops debug:', JSON.stringify(debug));
  }

  return res.status(200).json({ ok: true, debug });
}
