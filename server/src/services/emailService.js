const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Graceful fallback for local development: console or test account
    transporter = {
      sendMail: async (options) => {
        console.log(`[Email Simulation] To: ${options.to}`);
        console.log(`[Email Simulation] Subject: ${options.subject}`);
        console.log(`[Email Simulation] Snippet: ${options.text || options.html?.slice(0, 100)}`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }
  return transporter;
}

async function sendHighRiskAlertEmail({ mentorEmail, mentorName, studentName, rollNo, score, level, topFactors }) {
  try {
    const mailer = await getTransporter();

    const factorsHtml = topFactors
      .map((f) => `<li><strong>${f.label || f.feature}</strong>: ${f.explanation}</li>`)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-top: 0;">EduRetain Early Risk Alert</h2>
        <p>Dear ${mentorName || 'Faculty Mentor'},</p>
        <p>This is an automated notification from the <strong>EduRetain Retention Monitoring System</strong>.</p>
        <p>Student <strong>${studentName}</strong> (Roll No: <strong>${rollNo}</strong>) has been evaluated with a <strong>${level.toUpperCase()} DROPOUT RISK</strong> (Risk Probability: <strong>${(score * 100).toFixed(1)}%</strong>).</p>
        
        <h3 style="color: #1e293b;">Top Contributing Factors:</h3>
        <ul>${factorsHtml}</ul>

        <p>Please log in to your EduRetain dashboard to review system-recommended interventions and initiate early retention support.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px;">
          Note: EduRetain AI risk assessments are predictive decision-support indicators designed to assist, not replace, faculty and mentor professional judgment.
        </p>
      </div>
    `;

    await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"EduRetain System" <no-reply@institution.edu>',
      to: mentorEmail,
      subject: `[High Risk Alert] Student ${studentName} (${rollNo}) - Retention Intervention Required`,
      html,
      text: `Alert: Student ${studentName} (${rollNo}) has crossed into ${level} dropout risk (${(score * 100).toFixed(1)}%). Please review EduRetain dashboard.`,
    });

    console.log(`[Email Alert] Sent high risk notification to ${mentorEmail} for student ${rollNo}`);
  } catch (err) {
    console.error(`[Email Alert Error] Failed to send email: ${err.message}`);
  }
}

module.exports = { sendHighRiskAlertEmail };
