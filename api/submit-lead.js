const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || 'appPLCdGWMfpyDs8A';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'tblVVv9Gou91CZOeH';
const AIRTABLE_URL   = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const body = req.body;

  const record = {
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
  };

  const airtableRes = await fetch(AIRTABLE_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ records: [record] }),
  });

  if (!airtableRes.ok) {
    const err = await airtableRes.text();
    console.error('[submit-lead] Airtable error:', err);
    return res.status(502).json({ error: 'Airtable error' });
  }

  return res.status(200).json({ ok: true });
}
