// ── Apex Agency — Newsletter Route ─────────────────────────
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');

// ── Validation ─────────────────────────────────────────────
const newsletterSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ── POST /api/newsletter ───────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const validation = newsletterSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await query(
      'SELECT id, is_active, confirmed FROM newsletter_subscribers WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const subscriber = existing.rows[0];
      
      if (subscriber.is_active) {
        return res.json({
          success: true,
          message: 'You\'re already subscribed!',
        });
      }

      // Re-activate
      await query(
        'UPDATE newsletter_subscribers SET is_active = TRUE, unsubscribed_at = NULL WHERE id = $1',
        [subscriber.id]
      );

      return res.json({
        success: true,
        message: 'Welcome back! You\'ve been re-subscribed.',
      });
    }

    // Insert new subscriber
    const confirmationToken = uuidv4();
    await query(
      `INSERT INTO newsletter_subscribers (email, confirmation_token, source)
       VALUES ($1, $2, $3)`,
      [normalizedEmail, confirmationToken, 'website']
    );

    // Send confirmation email (async)
    sendConfirmationEmail(normalizedEmail, confirmationToken).catch(err => {
      console.error('[Newsletter] Confirmation email error:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Almost there! Check your email to confirm your subscription.',
    });

  } catch (err) {
    console.error('[Newsletter] Error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ── GET /api/newsletter/confirm ────────────────────────────
router.get('/confirm', async (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send('Invalid confirmation link.');
  }

  try {
    const result = await query(
      `UPDATE newsletter_subscribers 
       SET confirmed = TRUE, confirmed_at = NOW(), confirmation_token = NULL 
       WHERE email = $1 AND confirmation_token = $2 AND confirmed = FALSE
       RETURNING id`,
      [email.toLowerCase(), token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Link is invalid or already confirmed.');
    }

    res.send(`
      <html><body style="font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #F7F7FA;">
        <div style="text-align: center; padding: 40px;">
          <div style="width: 64px; height: 64px; margin: 0 auto 24px; background: #D4AF37; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 style="font-family: 'Playfair Display', serif; color: #0A0B1E; font-size: 28px; margin-bottom: 12px;">Subscription Confirmed!</h1>
          <p style="color: #666; line-height: 1.7;">You're now subscribed to Apex Agency insights. Welcome aboard!</p>
          <a href="/" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #0A0B1E; color: #F7F7FA; border-radius: 6px; text-decoration: none; font-weight: 600;">Back to Site</a>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error('[Newsletter] Confirm error:', err);
    res.status(500).send('Confirmation failed.');
  }
});

async function sendConfirmationEmail(email, token) {
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

  const confirmUrl = `${process.env.APP_URL}/api/newsletter/confirm?token=${token}&email=${encodeURIComponent(email)}`;

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Confirm your subscription — Apex Agency',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #0A0B1E; font-size: 24px; margin-bottom: 20px;">
          Almost there!
        </h1>
        <p style="color: #555; line-height: 1.7; margin-bottom: 20px;">
          Click the button below to confirm your subscription to Apex Agency insights.
        </p>
        <a href="${confirmUrl}" 
           style="display: inline-block; background: #D4AF37; color: #0A0B1E; padding: 14px 32px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 16px;">
          Confirm Subscription
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 20px;">
          If you didn't sign up, please ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = router;
