/**
 * Netlify Serverless Function: /.netlify/functions/contact
 * Handles public inquiry & contact form submissions
 */

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
      body: ''
    };
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    if (event.body) {
      try {
        const raw = event.isBase64Encoded 
          ? Buffer.from(event.body, 'base64').toString('utf8') 
          : event.body;
        body = JSON.parse(raw);
      } catch (e) {
        body = { raw: event.body };
      }
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: 'success',
        message: 'Thank you! Your advisory request has been registered.',
        received: {
          name: body.name || null,
          email: body.email || null,
          timestamp: new Date().toISOString()
        }
      })
    };
  }

  return {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify({ status: 'success', message: 'Tianum Contact API is online' })
  };
};
