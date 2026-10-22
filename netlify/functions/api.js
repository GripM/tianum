/**
 * Netlify Serverless Function: /api/*
 */
const marketDataFunc = require('./market-data');

function contactHandler(req, res) {
  if (req.method === 'POST') {
    return res.status(200).json({
      status: 'success',
      message: 'Thank you! Your advisory request has been registered.'
    });
  }
  return res.status(200).json({ status: 'success' });
}

function enquiryHandler(req, res) {
  if (req.method === 'POST') {
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
