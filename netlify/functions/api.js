/**
 * Netlify Serverless Function: /api/*
 */
const marketDataFunc = require('./market-data');

const globalEnquiries = global.__TIANUM_GLOBAL_ENQUIRIES__ || (global.__TIANUM_GLOBAL_ENQUIRIES__ = [
  {
    id: 1,
    name: 'Vikramaditya Singhania',
    email: 'v.singhania@singhaniaholdings.com',
    mobile: '+91 98220 14820',
    subject: 'Wealth Management & Multi-Asset Allocation',
    message: 'Looking for fiduciary consultation on structuring family office investments and private wealth across PMS/AIFs.',
    status: 'New',
    is_read: false,
    created_at: '2026-10-13 14:15:22',
    updated_at: '2026-10-13 14:15:22'
  },
  {
    id: 2,
    name: 'Sunil Kulkarni',
    email: 'sunil.kulkarni@techapex.in',
    mobile: '+91 94225 33019',
    subject: 'Corporate Treasury & Fixed Income',
    message: 'Interested in debt syndication and liquidity management solutions for our mid-market tech firm in Pune.',
    status: 'In Progress',
    is_read: true,
    created_at: '2026-10-12 16:40:10',
    updated_at: '2026-10-13 09:20:00'
  },
  {
    id: 3,
    name: 'Ananya Deshmukh',
    email: 'ananya.d@nexuscap.com',
    mobile: '+91 97640 21908',
    subject: 'Investment Banking & M&A Advisory',
    message: 'Seeking advisory on Series B growth capital and institutional equity placements in Maharashtra.',
    status: 'Resolved',
    is_read: true,
    created_at: '2026-10-11 11:25:00',
    updated_at: '2026-10-12 18:00:00'
  },
  {
    id: 4,
    name: 'Dr. Rajeshwar Rao',
    email: 'dr.rao.cardio@apollohealth.org',
    mobile: '+91 98501 77234',
    subject: 'Portfolio Management Services (PMS)',
    message: 'Need a comprehensive portfolio audit of existing equity mutual funds and advisory on direct indexed equities.',
    status: 'New',
    is_read: false,
    created_at: '2026-10-10 18:10:45',
    updated_at: '2026-10-10 18:10:45'
  }
]);

function registerClientEnquiry(body) {
  if (!body) return;
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
  return newEnq;
}

function contactHandler(req, res) {
  if (req.method === 'POST') {
    registerClientEnquiry(req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Thank you! Your advisory request has been registered.'
    });
  }
  return res.status(200).json({ status: 'success' });
}

function enquiryHandler(req, res) {
  if (req.method === 'POST') {
    registerClientEnquiry(req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Thank you! Your advisory request has been registered.'
    });
  }
  return res.status(200).json({ status: 'success' });
}

function createMockReqRes(event) {
  const req = {
    method: event.httpMethod,
    headers: event.headers,
    query: event.queryStringParameters || {},
    body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : {}
  };

  try {
    if (typeof req.body === 'string' && req.body.startsWith('{')) {
      req.body = JSON.parse(req.body);
    }
  } catch (e) {}

  let responseData = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: ''
  };

  const res = {
    setHeader: (name, val) => {
      responseData.headers[name] = val;
    },
    status: (code) => {
      responseData.statusCode = code;
      return res;
    },
    json: (data) => {
      responseData.headers['Content-Type'] = 'application/json';
      responseData.body = JSON.stringify(data);
      return res;
    },
    send: (data) => {
      responseData.body = typeof data === 'object' ? JSON.stringify(data) : String(data);
      return res;
    },
    end: (data) => {
      if (data) responseData.body = data;
      return res;
    }
  };

  return { req, res, responseData };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  const path = event.path || '';
  const { req, res, responseData } = createMockReqRes(event);

  if (path.includes('market-data')) {
    return await marketDataFunc.handler(event, context);
  }

  if (path.includes('admin/enquiries/status')) {
    const { id, status } = req.body || {};
    const item = globalEnquiries.find(e => String(e.id) === String(id));
    if (item) {
      item.status = status;
      item.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    }
    return res.status(200).json({ status: 'success', message: 'Status updated' });
  }

  if (path.includes('admin/enquiries/read')) {
    const { id } = req.body || {};
    const item = globalEnquiries.find(e => String(e.id) === String(id));
    if (item) {
      item.is_read = !item.is_read;
    }
    return res.status(200).json({ status: 'success', message: 'Read state updated' });
  }

  if (path.includes('admin/enquiries/delete')) {
    const { id } = req.body || {};
    const idx = globalEnquiries.findIndex(e => String(e.id) === String(id));
    if (idx !== -1) {
      globalEnquiries.splice(idx, 1);
    }
    return res.status(200).json({ status: 'success', message: 'Enquiry deleted' });
  }

  if (path.includes('admin/enquiries')) {
    return res.status(200).json({ status: 'success', enquiries: globalEnquiries });
  }

  if (path.includes('admin/stats')) {
    return res.status(200).json({
      status: 'success',
      total: globalEnquiries.length,
      unread: globalEnquiries.filter(e => !e.is_read || e.status === 'New').length,
      in_progress: globalEnquiries.filter(e => e.status === 'In Progress').length,
      resolved: globalEnquiries.filter(e => e.status === 'Resolved').length
    });
  }

  if (path.includes('contact')) {
    contactHandler(req, res);
    return responseData;
  }

  if (path.includes('enquiry')) {
    enquiryHandler(req, res);
    return responseData;
  }

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ status: 'success', message: 'Tianum API Live' })
  };
};
