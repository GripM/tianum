/**
 * Vercel Serverless Function: /api/contact
 * Handles public contact & consultation inquiries
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

    if (body.name || body.email) {
      const globalEnquiries = global.__TIANUM_GLOBAL_ENQUIRIES__ || (global.__TIANUM_GLOBAL_ENQUIRIES__ = []);
      const newEnq = {
        id: body.id || Date.now(),
        name: body.name || 'Client',
        email: body.email || '',
        mobile: body.mobile || body.phone || '',
        subject: body.subject || 'Website Consultation Request',
        message: body.message || 'Consultation request from website form',
        status: 'New',
        is_read: false,
        created_at: body.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: body.updated_at || new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      if (!globalEnquiries.some(e => String(e.id) === String(newEnq.id))) {
        globalEnquiries.unshift(newEnq);
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Thank you! Your advisory request has been registered.',
      received: {
        name: body.name || null,
        email: body.email || null,
        timestamp: new Date().toISOString()
      }
    });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Tianum Contact API is online'
  });
};
