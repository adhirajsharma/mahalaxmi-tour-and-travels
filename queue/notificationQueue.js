// Direct Async Notification Service (Email via Nodemailer & WhatsApp via Meta Official Cloud API)
// Optimized for up to 100 daily users.
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (err) {
  console.error('[Nodemailer Load Error]', err && err.message ? err.message : err);
}

const DAILY_USER_LIMIT = 100;
const recentEnquiries = [];
const enquiryLedger = new Map();

/**
 * Simple retry wrapper (2 attempts) for external API resilience
 */
async function withRetry(fn, retries = 2, delayMs = 500) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

/**
 * Normalize phone number to E.164 digits (defaults to +91 for 10-digit Indian numbers)
 */
function normalizePhoneE164(rawNumber) {
  const digits = String(rawNumber || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Build the custom message for WhatsApp & Email
 */
function buildCustomGreetingMessage({ enquiryId, name, number, email, source, destination }) {
  return [
    `Namaste ${name},`,
    ``,
    `Thank you for enquiring with Mahalaxmi Tours and Travels!`,
    `We have received your travel enquiry (#${enquiryId}) from ${source} to ${destination}.`,
    `We will reach out to you in some time on WhatsApp (${number}) and Email (${email}).`,
    ``,
    `--- Trip Enquiry Details ---`,
    `• Reference ID : #${enquiryId}`,
    `• Name         : ${name}`,
    `• Pickup       : ${source}`,
    `• Destination  : ${destination}`,
    `• WhatsApp No. : ${number}`,
    ``,
    `Warm regards,`,
    `Mahalaxmi Tours and Travels`,
    `Office: AM-18, DD Nagar, Gwalior, Madhya Pradesh`,
    `WhatsApp: +918871724435 | Email: pravin361f@gmail.com`
  ].join('\n');
}

/**
 * 1. Send Email Notification via Nodemailer (to Customer AND to Owner/Admin)
 */
async function sendEmailNotification(data) {
  const { enquiryId, name, email, number, source, destination, whatsappDirectUrl } = data;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@example.com';
  const subject = `Thank You for Enquiring (#${enquiryId}) — Mahalaxmi Tours and Travels`;
  const textBody = buildCustomGreetingMessage(data);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background: #F8FAFC; padding: 28px; color: #0F172A; border: 1px solid #E2E8F0; border-radius: 10px;">
      <div style="background: #0F172A; color: #FFFFFF; padding: 16px 20px; border-radius: 8px 8px 0 0; border-bottom: 3px solid #F59E0B;">
        <h2 style="margin: 0; font-size: 20px;">Mahalaxmi Tours and Travels</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #FBBF24;">Reliable Cab Rentals &amp; Travel Services</p>
      </div>
      <div style="background: #FFFFFF; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Namaste <strong>${name}</strong>,</p>
        <p style="font-size: 15px; color: #0F172A;">
          <strong>Thank you for enquiring with Mahalaxmi Tours and Travels! We will reach out to you in some time on WhatsApp and Email.</strong>
        </p>
        <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 16px; margin: 16px 0; font-size: 13px; line-height: 1.7;">
          <div><strong>Reference ID:</strong> #${enquiryId}</div>
          <div><strong>Source (Pickup):</strong> ${source}</div>
          <div><strong>Destination (Drop):</strong> ${destination}</div>
          <div><strong>WhatsApp Number:</strong> ${number}</div>
          <div><strong>Email Address:</strong> ${email}</div>
        </div>
        <p style="font-size: 12px; color: #475569;">Office: AM-18, DD Nagar, Gwalior, MP | WhatsApp: <strong>+918871724435</strong> | Email: <strong>pravin361f@gmail.com</strong></p>
      </div>
    </div>
  `;

  const adminSubject = `🚖 New Travel Enquiry #${enquiryId}: ${name} (${source} ➔ ${destination})`;
  const adminHtmlBody = `
    <div style="font-family: Arial, sans-serif; background: #F8FAFC; padding: 24px; color: #0F172A; border: 1px solid #E2E8F0; border-radius: 10px;">
      <h2 style="margin: 0 0 12px; color: #0F172A;">New Enquiry Received (#${enquiryId})</h2>
      <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-left: 4px solid #EA580C; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.8;">
        <div><strong>Customer Name:</strong> ${name}</div>
        <div><strong>Customer Email:</strong> <a href="mailto:${email}">${email}</a></div>
        <div><strong>WhatsApp / Mobile:</strong> <a href="tel:${number}">${number}</a></div>
        <div><strong>Source (Pickup):</strong> ${source}</div>
        <div><strong>Destination (Drop):</strong> ${destination}</div>
      </div>
      <div style="margin-top: 18px;">
        <a href="${whatsappDirectUrl}" style="display: inline-block; background: #16A34A; color: #FFFFFF; padding: 11px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
          💬 Click to Reply on Customer's WhatsApp (${number})
        </a>
      </div>
    </div>
  `;

  const smtpUser = String(process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  const smtpPass = String(process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '');
  const rawHost = String(process.env.SMTP_HOST || '').trim().replace(/^["']|["']$/g, '');
  const isGmail = rawHost === 'smtp.gmail.com' || smtpUser.toLowerCase().includes('@gmail.com');
  const smtpHost = rawHost || (isGmail ? 'smtp.gmail.com' : '');
  const smtpPort = Number(process.env.SMTP_PORT || (isGmail ? 465 : 587));

  if (nodemailer && smtpUser && smtpPass && smtpHost) {
    try {
      let transporterConfig;
      if (isGmail) {
        transporterConfig = {
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        };
      } else {
        transporterConfig = {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);
      console.log(`[Email] Dispatching emails via ${isGmail ? 'Gmail Service' : smtpHost} (user: ${smtpUser})...`);

      const [customerMail, adminMail] = await Promise.all([
        withRetry(() =>
          transporter.sendMail({
            from: `"Mahalaxmi Tours and Travels" <${smtpUser}>`,
            replyTo: adminEmail,
            to: email,
            subject,
            text: textBody,
            html: htmlBody
          })
        ),
        withRetry(() =>
          transporter.sendMail({
            from: `"Mahalaxmi Website Lead" <${smtpUser}>`,
            replyTo: email,
            to: adminEmail,
            subject: adminSubject,
            text: `New Enquiry #${enquiryId}\nName: ${name}\nEmail: ${email}\nWhatsApp: ${number}\nSource: ${source}\nDestination: ${destination}\nReply on WhatsApp: ${whatsappDirectUrl}`,
            html: adminHtmlBody
          })
        )
      ]);

      console.log(`[Email Success] Customer email ID: ${customerMail.messageId}, Admin alert ID: ${adminMail.messageId}`);
      return {
        channel: 'email',
        provider: 'nodemailer-smtp',
        messageId: customerMail.messageId,
        adminMessageId: adminMail.messageId,
        to: email,
        adminTo: adminEmail,
        subject,
        preview: textBody,
        sentAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('[Email SMTP Error]', err && err.message ? err.message : err);
      throw err;
    }
  }

  console.warn(`[Email Notice] Running in simulated mode. Missing credentials: nodemailer=${Boolean(nodemailer)}, smtpUser=${Boolean(smtpUser)}, smtpPass=${Boolean(smtpPass)}, smtpHost=${Boolean(smtpHost)}`);
  return {
    channel: 'email',
    provider: 'simulated-email',
    messageId: `mlx-email-${Date.now()}`,
    to: email,
    subject,
    preview: textBody,
    sentAt: new Date().toISOString()
  };
}

/**
 * Helper to call Meta Official WhatsApp Cloud API (v20.0)
 */
async function callMetaWhatsappApi(toDigits, textBody) {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const cloudUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

  const response = await fetch(cloudUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toDigits,
      type: 'text',
      text: { preview_url: false, body: textBody }
    })
  });

  const resJson = await response.json();
  if (!response.ok || resJson.error) {
    throw new Error(
      (resJson.error && resJson.error.message) || `Meta WhatsApp API HTTP ${response.status}`
    );
  }
  return resJson;
}

/**
 * 2. Send WhatsApp Notification via Meta Official WhatsApp Cloud API (Method 1)
 */
async function sendWhatsappNotification(data) {
  const { enquiryId, name, email, number, source, destination } = data;
  const toE164 = normalizePhoneE164(number);
  const waDigits = toE164.replace(/\D/g, '');
  const adminWaDigits = String(process.env.ADMIN_WHATSAPP || '918871724435').replace(/\D/g, '');

  const whatsappText = [
    `🚖 *Mahalaxmi Tours and Travels*`,
    `Namaste *${name}*! 🙏`,
    ``,
    `Thank you for enquiring! We have received your enquiry (*#${enquiryId}*) from *${source}* to *${destination}*.`,
    `We will reach out to you in some time on *WhatsApp* (${number}) and *Email* (${email}).`,
    ``,
    `📍 *Source:* ${source}`,
    `🏁 *Destination:* ${destination}`,
    ``,
    `For immediate help, call or WhatsApp us at *+918871724435*.`
  ].join('\n');

  const directWaUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(whatsappText)}`;

  // Method 1: Meta Official WhatsApp Cloud API
  if (
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN &&
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID &&
    typeof fetch === 'function'
  ) {
    // 1. Send confirmation to Customer's WhatsApp number
    const resJson = await withRetry(() => callMetaWhatsappApi(waDigits, whatsappText));

    // 2. Also send lead alert to Admin/Owner WhatsApp number
    if (adminWaDigits && adminWaDigits !== waDigits) {
      const adminAlertText = [
        `🔔 *New Website Enquiry (#${enquiryId})*`,
        `• *Customer:* ${name}`,
        `• *WhatsApp:* ${number}`,
        `• *Email:* ${email}`,
        `• *Source:* ${source}`,
        `• *Destination:* ${destination}`
      ].join('\n');
      try {
        await callMetaWhatsappApi(adminWaDigits, adminAlertText);
      } catch (adminErr) {
        console.warn('[WhatsApp Admin Alert Note]', adminErr.message);
      }
    }

    const msgId =
      (resJson.messages && resJson.messages[0] && resJson.messages[0].id) || `wa-${Date.now()}`;
    console.log(`[WhatsApp Cloud API] Sent confirmation to ${toE164} (ID: ${msgId})`);

    return {
      channel: 'whatsapp',
      provider: 'meta-whatsapp-cloud-api',
      messageId: msgId,
      to: toE164,
      preview: whatsappText,
      directWaUrl,
      sentAt: new Date().toISOString()
    };
  }

  // Fallback preview when WHATSAPP_CLOUD_ACCESS_TOKEN is not filled in yet
  return {
    channel: 'whatsapp',
    provider: 'simulated-whatsapp',
    sid: `WA${Math.random().toString(16).slice(2, 12).toUpperCase()}`,
    to: toE164,
    preview: whatsappText,
    directWaUrl,
    sentAt: new Date().toISOString()
  };
}

async function initNotificationQueue() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (user && pass) {
    console.log(`[Notifications] Live SMTP Email enabled (${user}).`);
  } else {
    console.log(`[Notifications] Running in simulated Email mode (SMTP_USER or SMTP_PASS not set).`);
  }

  if (process.env.WHATSAPP_CLOUD_ACCESS_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    console.log(
      `[Notifications] Live Meta WhatsApp Cloud API enabled (Phone ID: ${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}).`
    );
  } else {
    console.log(
      `[Notifications] Meta WhatsApp Cloud API standby — paste WHATSAPP_CLOUD_ACCESS_TOKEN & WHATSAPP_CLOUD_PHONE_NUMBER_ID in .env to enable live WhatsApp.`
    );
  }
}

/**
 * Dispatch Email and WhatsApp notifications directly using async Promise.allSettled
 */
async function enqueueNotifications(enquiryPayload) {
  const enquiryId = `MLX-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const createdAt = new Date().toISOString();
  const toE164 = normalizePhoneE164(enquiryPayload.number);
  const waDigits = toE164.replace(/\D/g, '');

  const whatsappMessage = [
    `🚖 *Mahalaxmi Tours and Travels*`,
    `Namaste *${enquiryPayload.name}*! 🙏`,
    `Thank you for enquiring! We have received your enquiry (*#${enquiryId}*) from *${enquiryPayload.source}* to *${enquiryPayload.destination}*.`,
    `We will reach out to you in some time on *WhatsApp* and *Email*.`
  ].join('\n');

  const record = {
    enquiryId,
    name: enquiryPayload.name,
    email: enquiryPayload.email,
    number: enquiryPayload.number,
    normalizedNumber: toE164,
    source: enquiryPayload.source,
    destination: enquiryPayload.destination,
    customMessage: `Thank you for enquiring, ${enquiryPayload.name}! We have received your request from ${enquiryPayload.source} to ${enquiryPayload.destination} and we will reach out to you in some time on WhatsApp and Email.`,
    whatsappDirectUrl: `https://wa.me/${waDigits}?text=${encodeURIComponent(whatsappMessage)}`,
    emailStatus: 'sending',
    whatsappStatus: 'sending',
    emailResult: null,
    whatsappResult: null,
    createdAt,
    updatedAt: createdAt
  };

  enquiryLedger.set(enquiryId, record);
  recentEnquiries.unshift(record);
  if (recentEnquiries.length > DAILY_USER_LIMIT) {
    recentEnquiries.pop();
  }

  // Run Email & WhatsApp notifications concurrently
  const [emailOutcome, waOutcome] = await Promise.allSettled([
    sendEmailNotification(record),
    sendWhatsappNotification(record)
  ]);

  if (emailOutcome.status === 'fulfilled') {
    record.emailStatus = 'completed';
    record.emailResult = emailOutcome.value;
  } else {
    console.error(
      '[Email Error]',
      emailOutcome.reason && emailOutcome.reason.message ? emailOutcome.reason.message : emailOutcome.reason
    );
    record.emailStatus = 'failed';
  }

  if (waOutcome.status === 'fulfilled') {
    record.whatsappStatus = 'completed';
    record.whatsappResult = waOutcome.value;
  } else {
    console.error(
      '[WhatsApp Cloud API Error]',
      waOutcome.reason && waOutcome.reason.message ? waOutcome.reason.message : waOutcome.reason
    );
    record.whatsappStatus = 'failed';
  }

  record.updatedAt = new Date().toISOString();
  return record;
}

function getQueueStats() {
  return {
    dailyUserLimit: DAILY_USER_LIMIT,
    todayEnquiriesCount: recentEnquiries.length,
    remainingDailySlots: Math.max(0, DAILY_USER_LIMIT - recentEnquiries.length)
  };
}

function getEnquiryById(enquiryId) {
  return enquiryLedger.get(enquiryId) || null;
}

module.exports = {
  initNotificationQueue,
  enqueueNotifications,
  getQueueStats,
  getEnquiryById
};
