const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE  || 'appPLCdGWMfpyDs8A';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE || 'tblVVv9Gou91CZOeH';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

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
      'Entry Point':  'book_call',
      'UTM Source':   body.utm_source   || '',
      'UTM Medium':   body.utm_medium   || '',
      'UTM Campaign': body.utm_campaign || '',
      'UTM Content':  body.utm_content  || '',
      'UTM Term':     body.utm_term     || '',
    },
  };

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ records: [record] }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[submit-lead] Airtable error:', err);
    return { statusCode: 502, body: 'Airtable error' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
