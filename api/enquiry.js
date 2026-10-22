/**
 * Vercel Serverless Function: /api/enquiry
 * Handles public client mandate & wealth management inquiries
 */

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = { raw: body };
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Thank you! Your advisory request has been registered.',
      received: {
        name: body.name || null,
        email: body.email || null,
        subject: body.subject || null,
        timestamp: new Date().toISOString()
      }
    });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Tianum Enquiry API is online'
  });
};
