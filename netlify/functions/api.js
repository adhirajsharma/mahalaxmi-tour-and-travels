// nodemailer is externalized in netlify.toml — loaded at runtime from node_modules, not bundled
// No need to pre-require here; notificationQueue.js does a hard require('nodemailer')

const {
  buildGetDataResponse,
  processPostEnquiry,
  processPostReview
} = require('../../server');

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  // 1. Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: RESPONSE_HEADERS,
      body: ''
    };
  }

  // 2. Normalize route path
  let requestPath = (event.path || '').toLowerCase();
  requestPath = requestPath.replace(/^\/\.netlify\/functions\/api/, '');
  requestPath = requestPath.replace(/^\/api/, '');
  if (!requestPath.startsWith('/')) {
    requestPath = '/' + requestPath;
  }
  // Trim trailing slash if present
  if (requestPath.length > 1 && requestPath.endsWith('/')) {
    requestPath = requestPath.slice(0, -1);
  }

  try {
    // 3. GET /api/data or /api/tours
    if (event.httpMethod === 'GET' && (requestPath === '/data' || requestPath === '/tours')) {
      const queryParams = event.queryStringParameters || {};
      const result = buildGetDataResponse(queryParams);
      return {
        statusCode: result.statusCode,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(result.body)
      };
    }

    // 4. POST /api/reviews
    if (event.httpMethod === 'POST' && requestPath === '/reviews') {
      const payload = event.body ? JSON.parse(event.body) : {};
      const result = processPostReview(payload);
      return {
        statusCode: result.statusCode,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(result.body)
      };
    }

    // 5. POST /api/enquiry or /api/notify
    if (event.httpMethod === 'POST' && (requestPath === '/enquiry' || requestPath === '/notify')) {
      const payload = event.body ? JSON.parse(event.body) : {};
      const result = await processPostEnquiry(payload);
      return {
        statusCode: result.statusCode,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(result.body)
      };
    }

    // 6. 404 for unknown API endpoints
    return {
      statusCode: 404,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        success: false,
        error: `API route not found: ${event.httpMethod} ${event.path} (resolved: ${requestPath})`
      })
    };
  } catch (err) {
    console.error('[Netlify Function Error]', err);
    return {
      statusCode: 500,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error'
      })
    };
  }
};
