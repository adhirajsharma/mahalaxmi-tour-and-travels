const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Load .env and .env.example (works with or without dotenv installed)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key] && val !== '') {
      process.env[key] = val;
    }
  }
}

try {
  require('dotenv').config();
} catch (_) {}
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.example'));

const DATA_FILE = path.join(__dirname, 'data', 'tours.json');
const siteData = require('./data/tours.json');
const {
  initNotificationQueue,
  enqueueNotifications,
  getQueueStats,
  getEnquiryById
} = require('./queue/notificationQueue');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

// Daily user tracker (for up to 100 daily users)
const dailyVisitors = new Set();

function trackVisitor(ip) {
  const visitorKey = `${new Date().toISOString().slice(0, 10)}-${ip || 'local'}`;
  if (dailyVisitors.size < 100) {
    dailyVisitors.add(visitorKey);
  }
}

/**
 * ENDPOINT 1: GET /api/data (also aliased at GET /api/tours)
 * Fetches WhatsApp number, email, office location, car listing, and customer reviews.
 */
function buildGetDataResponse(queryParams) {
  const { category, enquiryId } = queryParams || {};

  if (enquiryId) {
    const enquiry = getEnquiryById(String(enquiryId));
    if (!enquiry) {
      return {
        statusCode: 404,
        body: { success: false, error: `Enquiry ${enquiryId} not found.` }
      };
    }
    return {
      statusCode: 200,
      body: { success: true, enquiry }
    };
  }

  let cars = [...(siteData.fleet || [])];
  if (category && category !== 'all') {
    cars = cars.filter((c) => c.category === category);
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      brand: siteData.brand,
      cars,
      reviews: siteData.reviews || []
    }
  };
}

/**
 * Handle posting a new customer review
 */
function processPostReview(payload) {
  const { name, city, car, rating, comment } = payload || {};
  const cleanName = String(name || '').trim();
  const cleanCity = String(city || 'Gwalior').trim() || 'Gwalior';
  const cleanCar = String(car || 'Swift Dzire (₹12/KM)').trim();
  const cleanComment = String(comment || '').trim();
  const numRating = Math.min(5, Math.max(1, Number(rating || 5)));

  if (!cleanName || cleanName.length < 2) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Please enter your name.' }
    };
  }

  if (!cleanComment || cleanComment.length < 5) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Please write a short review (at least 5 characters).' }
    };
  }

  const newReview = {
    name: cleanName,
    city: cleanCity,
    car: cleanCar,
    rating: numRating,
    comment: cleanComment,
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(siteData.reviews)) {
    siteData.reviews = [];
  }
  siteData.reviews.unshift(newReview);

  // Persist to data/tours.json in background
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(siteData, null, 2), 'utf8');
  } catch (_) {}

  return {
    statusCode: 201,
    body: {
      success: true,
      message: 'Thank you for posting your review!',
      review: newReview,
      reviews: siteData.reviews
    }
  };
}

/**
 * ENDPOINT 2: POST /api/enquiry (also aliased at POST /api/notify)
 * Accepts { name, email, number, source, destination } and dispatches
 * Email and WhatsApp notifications.
 */
async function processPostEnquiry(payload) {
  if (payload && payload.type === 'review') {
    return processPostReview(payload);
  }

  const { name, email, number, source, destination } = payload || {};

  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanNumber = String(number || '').trim();
  const cleanSource = String(source || '').trim();
  const cleanDestination = String(destination || '').trim();

  if (!cleanName || cleanName.length < 2) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please enter your full name.'
      }
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please enter a valid email address.'
      }
    };
  }

  const digitsOnly = cleanNumber.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please enter a valid 10 to 15 digit WhatsApp number.'
      }
    };
  }

  if (!cleanSource) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please enter your pickup location (Source).'
      }
    };
  }

  if (!cleanDestination) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please enter your drop location (Destination).'
      }
    };
  }

  const stats = getQueueStats();
  if (stats.todayEnquiriesCount >= 100) {
    return {
      statusCode: 429,
      body: {
        success: false,
        error: 'Daily limit of 100 enquiries reached. Please WhatsApp us at +91 9356891309.'
      }
    };
  }

  const record = await enqueueNotifications({
    name: cleanName,
    email: cleanEmail,
    number: cleanNumber,
    source: cleanSource,
    destination: cleanDestination
  });

  return {
    statusCode: 201,
    body: {
      success: true,
      message: record.customMessage,
      enquiry: record
    }
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function startServer() {
  await initNotificationQueue();

  let express = null;
  try {
    express = require('express');
  } catch (_) {}

  if (express) {
    const app = express();
    app.use(express.json());
    app.use(express.static(PUBLIC_DIR));

    app.use((req, res, next) => {
      trackVisitor(req.ip);
      next();
    });

    app.get(['/api/data', '/api/tours'], (req, res) => {
      const result = buildGetDataResponse(req.query);
      res.status(result.statusCode).json(result.body);
    });

    app.post(['/api/enquiry', '/api/notify'], async (req, res) => {
      try {
        const result = await processPostEnquiry(req.body);
        res.status(result.statusCode).json(result.body);
      } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to send notification.' });
      }
    });

    app.post('/api/reviews', (req, res) => {
      try {
        const result = processPostReview(req.body);
        res.status(result.statusCode).json(result.body);
      } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to post review.' });
      }
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`\n✨ Mahalaxmi Tours and Travels running at http://localhost:${PORT}`);
      console.log(`   ├─ GET  /api/data    (Fetch WhatsApp, email, office location, cars & reviews)`);
      console.log(`   └─ POST /api/enquiry (Submit enquiry -> Email & WhatsApp notification)\n`);
    });
    return;
  }

  const server = http.createServer(async (req, res) => {
    trackVisitor(req.socket.remoteAddress);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && (pathname === '/api/data' || pathname === '/api/tours')) {
      const queryObj = Object.fromEntries(parsedUrl.searchParams.entries());
      const result = buildGetDataResponse(queryObj);
      res.writeHead(result.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(result.body));
    }

    if (
      req.method === 'POST' &&
      (pathname === '/api/enquiry' || pathname === '/api/notify' || pathname === '/api/reviews')
    ) {
      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = rawBody ? JSON.parse(rawBody) : {};
          const result =
            pathname === '/api/reviews'
              ? processPostReview(parsed)
              : await processPostEnquiry(parsed);
          res.writeHead(result.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result.body));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON request body.' }));
        }
      });
      return;
    }

    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    let filePath = path.join(PUBLIC_DIR, safePath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n✨ Mahalaxmi Tours and Travels running at http://localhost:${PORT}`);
    console.log(`   ├─ GET  /api/data    (Fetch WhatsApp, email, office location, cars & reviews)`);
    console.log(`   └─ POST /api/enquiry (Submit enquiry -> Email & WhatsApp notification)\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  buildGetDataResponse,
  processPostEnquiry,
  processPostReview,
  initNotificationQueue
};
