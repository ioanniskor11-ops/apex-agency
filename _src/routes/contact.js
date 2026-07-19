// ── Apex Agency — Contact Route ────────────────────────────
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query, getRedis } = require('../db');
const { v4: uuidv4 } = require('uuid');

// ── Validation Schema ──────────────────────────────────────
const contactSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\d\s\-\(\)\+]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  company: z.string().min(1, 'Company name is required').max(200),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  services: z.array(z.string()).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
  // hCaptcha token
  'h-captcha-response': z.string().optional(),
});

// ── hCaptcha Verification ──────────────────────────────────
async function verifyCaptcha(token) {
  if (process.env.HCAPTCHA_ENABLED !== 'true') return true;
  if (!token) return false;

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success;
  } catch (err) {
    console.error('[Captcha] Verification error:', err);
    return false;
  }
}

// ── Sanitize input ─────────────────────────────────────────
function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ── Send confirmation email ────────────────────────────────
async function sendConfirmationEmail(email, name, verificationToken) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const verifyUrl = `${process.env.APP_URL}/api/contact/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      replyTo: process.env.SMTP_REPLY_TO,
      to: email,
      subject: 'Please confirm your inquiry — Apex Agency',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #0A0B1E; font-size: 28px; margin-bottom: 20px;">
            Thank you for reaching out, ${sanitize(name)}
          </h1>
          <p style="color: #555; line-height: 1.7; font-size: 16px; margin-bottom: 20px;">
            We received your inquiry and will review it shortly. To confirm your email address 
            and ensure we can respond to you, please click the button below:
          </p>
          <a href="${verifyUrl}" 
             style="display: inline-block; background: #D4AF37; color: #0A0B1E; 
                    padding: 14px 32px; border-radius: 6px; font-weight: 600; 
                    text-decoration: none; font-size: 16px; margin-bottom: 20px;">
            Confirm Your Email
          </a>
          <p style="color: #888; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            If you didn't submit this inquiry, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #aaa; font-size: 12px;">
            &copy; 2024 Apex Agency LLC. All rights reserved.<br>
            ${process.env.APP_URL}
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[Email] Failed to send confirmation:', err);
    return false;
  }
}

// ── Send Slack notification ────────────────────────────────
async function sendSlackNotification(contact) {
  if (process.env.SLACK_NOTIFICATIONS_ENABLED !== 'true') return;

  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*New Lead from Website* 🎯`,
        attachments: [{
          color: '#D4AF37',
          fields: [
            { title: 'Name', value: contact.full_name, short: true },
            { title: 'Company', value: contact.company, short: true },
            { title: 'Email', value: contact.email, short: true },
            { title: 'Phone', value: contact.phone || 'N/A', short: true },
            { title: 'Budget', value: contact.budget || 'N/A', short: true },
            { title: 'Services', value: (contact.services || []).join(', ') || 'N/A', short: false },
            { title: 'Message', value: contact.message.substring(0, 300), short: false },
          ],
          footer: 'Apex Agency Website',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });
  } catch (err) {
    console.error('[Slack] Notification error:', err);
  }
}

// ── Send to CRM (webhook stub) ──────────────────────────────
async function sendToCRM(contact) {
  if (process.env.CRM_ENABLED !== 'true') return;

  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(process.env.CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRM_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          firstname: contact.full_name.split(' ')[0],
          lastname: contact.full_name.split(' ').slice(1).join(' '),
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          message: contact.message,
          lead_source: 'apex_website',
        },
      }),
    });
  } catch (err) {
    console.error('[CRM] Webhook error:', err);
  }
}

// ── POST /api/contact ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    // Validate with Zod
    const validation = contactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const data = validation.data;

    // Verify hCaptcha
    const captchaValid = await verifyCaptcha(data['h-captcha-response']);
    if (!captchaValid) {
      return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
    }

    // Check for duplicate (recent submission from same email)
    const recentCheck = await query(
      'SELECT id, created_at FROM contacts WHERE email = $1 AND created_at > NOW() - INTERVAL \'5 minutes\'',
      [data.email.toLowerCase().trim()]
    );

    if (recentCheck.rows.length > 0) {
      return res.status(429).json({ 
        error: 'You\'ve already submitted a form recently. We\'ll be in touch shortly!' 
      });
    }

    // Check rate by IP
    const ipCheck = await query(
      'SELECT COUNT(*) as count FROM contacts WHERE ip_address = $1 AND created_at > NOW() - INTERVAL \'1 hour\'',
      [req.ip]
    );
    if (parseInt(ipCheck.rows[0].count) >= 5) {
      return res.status(429).json({ error: 'Too many submissions from this IP address.' });
    }

    // Sanitize inputs
    const sanitized = {
      full_name: sanitize(data.full_name.trim()),
      email: data.email.toLowerCase().trim(),
      phone: data.phone ? sanitize(data.phone.trim()) : null,
      company: sanitize(data.company.trim()),
      budget: data.budget || null,
      timeline: data.timeline || null,
      services: data.services || [],
      message: sanitize(data.message.trim()),
    };

    const verificationToken = uuidv4();

    // Insert into database
    const result = await query(
      `INSERT INTO contacts (full_name, email, phone, company, budget, timeline, services, message, 
                             ip_address, user_agent, verification_token, verification_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id, created_at`,
      [
        sanitized.full_name,
        sanitized.email,
        sanitized.phone,
        sanitized.company,
        sanitized.budget,
        sanitized.timeline,
        sanitized.services,
        sanitized.message,
        req.ip,
        req.get('User-Agent') || null,
        verificationToken,
      ]
    );

    const contact = {
      id: result.rows[0].id,
      ...sanitized,
    };

    // Send notifications (async, don't block response)
    Promise.all([
      sendConfirmationEmail(sanitized.email, sanitized.full_name, verificationToken),
      sendSlackNotification(contact),
      sendToCRM(contact),
    ]).catch(err => console.error('[Contact] Async notification error:', err));

    // Log audit
    await query(
      'INSERT INTO audit_log (action, entity_type, entity_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5)',
      ['contact_created', 'contact', contact.id, JSON.stringify({ email: sanitized.email, company: sanitized.company }), req.ip]
    ).catch(() => {});

    // Return success
    res.status(201).json({
      success: true,
      message: 'Thank you! We\'ll review your inquiry and respond within 24 hours.',
      id: contact.id,
    });

  } catch (err) {
    console.error('[Contact] Error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/contact/verify (email verification) ──────────
router.get('/verify', async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send(`
      <html><body style="font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F7F7FA;">
        <div style="text-align: center; padding: 40px;">
          <h1 style="font-family: 'Playfair Display', serif; color: #0A0B1E;">Invalid Link</h1>
          <p style="color: #666;">This verification link is invalid or has expired.</p>
        </div>
      </body></html>
    `);
  }

  try {
    const result = await query(
      `UPDATE contacts 
       SET email_verified = TRUE, verified_at = NOW(), verification_token = NULL 
       WHERE email = $1 AND verification_token = $2 AND verified_at IS NULL
       RETURNING id, full_name`,
      [email.toLowerCase(), token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send(`
        <html><body style="font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F7F7FA;">
          <div style="text-align: center; padding: 40px;">
            <h1 style="font-family: 'Playfair Display', serif; color: #0A0B1E;">Already Verified</h1>
            <p style="color: #666;">Your email has already been confirmed. We'll be in touch soon!</p>
          </div>
        </body></html>
      `);
    }

    res.send(`
      <html><body style="font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F7F7FA;">
        <div style="text-align: center; padding: 40px; max-width: 480px;">
          <div style="width: 64px; height: 64px; margin: 0 auto 24px; background: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 style="font-family: 'Playfair Display', serif; color: #0A0B1E; font-size: 28px; margin-bottom: 12px;">Email Confirmed!</h1>
          <p style="color: #666; line-height: 1.7; font-size: 16px;">
            Thank you, ${sanitize(result.rows[0].full_name)}! Your email has been verified. 
            Our team will review your inquiry and get back to you within 24 hours.
          </p>
          <a href="/" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #0A0B1E; color: #F7F7FA; border-radius: 6px; text-decoration: none; font-weight: 600;">Visit Our Site</a>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error('[Verify] Error:', err);
    res.status(500).send('Verification failed. Please try again.');
  }
});

module.exports = router;
