const express = require('express');
const cors = require('cors');
require('dotenv').config();
var nodemailer = require('nodemailer')
const app = express();
const path = require('path'); 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const validateContactForm = (req, res, next) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email format' 
    });
  }

  next();
};

const rateLimit = require('express-rate-limit');
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    success: false,
    message: 'Too many contact attempts, please try again later.'
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('Nodemailer is NOT ready:', error);
  } else {
    console.log('Nodemailer is ready to send emails');
  }
});

app.post('/api/contact', contactLimiter, validateContactForm, async (req, res) => {
  const { name, email, subject, message } = req.body;

  const mailOptions = {
    from: email,
    to: process.env.RECIPIENT_EMAIL,
    subject: `Portfolio Contact: ${subject}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Contact Form Submission</h1>
        </div>
        <div style="padding: 30px; background: white;">
          <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Contact Details</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Message</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">Sent from Nicolas Planckaert Coelho's Portfolio</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);

    const confirmationMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting me!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Thank you for reaching out!</h2>
          <p>Hi ${name},</p>
          <p>I've received your message and will get back to you as soon as possible.</p>
          <p>Best regards,<br>Nicolas Planckaert Coelho</p>
        </div>
      `
    };
    await transporter.sendMail(confirmationMail);

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully! You should receive a confirmation email shortly.' 
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email. Please try again later.' 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});