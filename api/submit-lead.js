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
  if (LOOPS_API_KEY && body.email) {

    await Promise.allSettled([
      // Add/update contact
      fetch('https://app.loops.so/api/v1/contacts/create', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${LOOPS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     body.email,
          firstName: first,
          lastName:  body.name.split(' ').slice(1).join(' ') || '',
          source:    body.source || 'contact_form',
        }),
      }),

      // Confirmation email to lead
      fetch('https://app.loops.so/api/v1/transactional', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${LOOPS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionalId: LOOPS_CONFIRMATION_ID,
          email:           body.email,
          dataVariables:   { firstName: first },
        }),
      }),

      // Notification email to Jose
      fetch('https://app.loops.so/api/v1/transactional', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${LOOPS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionalId: LOOPS_NOTIFICATION_ID,
          email:           NOTIFICATION_EMAIL,
          dataVariables: {
            leadName:    body.name     || '—',
            leadEmail:   body.email    || '—',
            leadCompany: body.company  || '—',
            leadWebsite: body.website  || '—',
            leadMessage: body.message  || '—',
            leadSource:  body.source   || 'direct',
            leadPage:    body.entry_page || '—',
          },
        }),
      }),
    ]);
  }

  return res.status(200).json({ ok: true });
}
