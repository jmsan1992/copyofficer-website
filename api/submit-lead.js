const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || 'appPLCdGWMfpyDs8A';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'tblVVv9Gou91CZOeH';
const AIRTABLE_URL   = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

const LOOPS_API_KEY          = process.env.LOOPS_API_KEY;
const LOOPS_TRANSACTIONAL_ID = 'cmq67hi46063f0jy6daqoo0ku';

function firstName(fullName) {
  return (fullName || '').split(' ')[0] || fullName || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const body = req.body;
  const first = firstName(body.name);

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

  // 2. Add contact to Loops + send confirmation email
  if (LOOPS_API_KEY && body.email) {
    await Promise.allSettled([
      // Add/update contact in Loops
      fetch('https://app.loops.so/api/v1/contacts/create', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${LOOPS_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          email:     body.email,
          firstName: first,
          lastName:  body.name.split(' ').slice(1).join(' ') || '',
          source:    body.source || 'contact_form',
        }),
      }),

      // Send confirmation transactional email
      fetch('https://app.loops.so/api/v1/transactional', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${LOOPS_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          transactionalId: LOOPS_TRANSACTIONAL_ID,
          email:           body.email,
          dataVariables:   { firstName: first },
        }),
      }),
    ]);
  }

  return res.status(200).json({ ok: true, loopsKeySet: !!LOOPS_API_KEY });
}
