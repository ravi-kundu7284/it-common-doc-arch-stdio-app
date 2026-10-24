/**
 * Email & Notification Templates (Responsive Inline HTML + Plaintext Fallback)
 */

interface BaseTemplateContext {
  appBaseUrl: string;
  username?: string;
  email?: string;
}

const renderBaseHtml = (title: string, bodyContent: string, actionButton?: { text: string; url: string }) => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: left;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 24px; padding-right: 12px;">🏛️</td>
                  <td>
                    <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">DocArch AI</div>
                    <div style="font-size: 11px; color: #e0e7ff; text-transform: uppercase; letter-spacing: 1px;">Enterprise Architecture Studio</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 28px 24px 20px 24px;">
              <h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">${title}</h2>
              <div style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">
                ${bodyContent}
              </div>

              ${
                actionButton
                  ? `
                <div style="margin: 26px 0 20px 0; text-align: center;">
                  <a href="${actionButton.url}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #6366f1; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);">
                    ${actionButton.text}
                  </a>
                </div>
                <div style="margin-top: 14px; font-size: 11px; color: #64748b; word-break: break-all; line-height: 1.4;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${actionButton.url}" style="color: #818cf8; text-decoration: underline;">${actionButton.url}</a>
                </div>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 11px; color: #64748b;">
              <p style="margin: 0 0 4px 0;">This is an automated security message from DocArch Architecture Studio.</p>
              <p style="margin: 0;">If you did not request this communication, please contact your systems administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// 1. Email Verification Template
export function renderVerifyEmailTemplate(
  ctx: BaseTemplateContext & { token: string }
): { subject: string; html: string; text: string } {
  const verifyUrl = `${ctx.appBaseUrl}/verify-email?token=${ctx.token}`;
  const username = ctx.username || "Architect";

  const subject = "Verify your corporate email address — DocArch Studio";
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${username}</strong>,</p>
    <p style="margin: 0 0 12px 0;">Thank you for registering on <strong>DocArch AI Technical Architecture Studio</strong>. To activate full access to publish, export, and manage enterprise architecture artifacts, please verify your email address.</p>
    <div style="padding: 12px 14px; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; font-size: 12px; color: #94a3b8;">
      ⏱️ This verification link is strictly single-use and will expire in <strong>24 hours</strong>.
    </div>
  `;

  const html = renderBaseHtml("Verify Your Corporate Email", bodyContent, {
    text: "Verify Email Address",
    url: verifyUrl,
  });

  const text = `Hello @${username},

Please verify your corporate email address for DocArch Architecture Studio:

${verifyUrl}

This link is single-use and expires in 24 hours.

If you did not create this account, please ignore this email.`;

  return { subject, html, text };
}

// 2. Password Reset Template
export function renderPasswordResetTemplate(
  ctx: BaseTemplateContext & { token: string }
): { subject: string; html: string; text: string } {
  const resetUrl = `${ctx.appBaseUrl}/reset-password?token=${ctx.token}`;
  const username = ctx.username || "Architect";

  const subject = "Password Reset Request — DocArch Studio";
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${username}</strong>,</p>
    <p style="margin: 0 0 12px 0;">We received a request to reset your password for your DocArch AI account. Click the button below to choose a new secure password.</p>
    <div style="padding: 12px 14px; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; font-size: 12px; color: #94a3b8;">
      🔒 For security, this link is single-use and valid for <strong>30 minutes</strong> only.
    </div>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">If you did not request a password reset, you can safely disregard this message. Your existing credentials remain completely secure.</p>
  `;

  const html = renderBaseHtml("Reset Your Account Password", bodyContent, {
    text: "Reset Password",
    url: resetUrl,
  });

  const text = `Hello @${username},

We received a request to reset your DocArch Studio password:

${resetUrl}

This link is single-use and valid for 30 minutes.

If you did not make this request, you can safely ignore this email.`;

  return { subject, html, text };
}

// 3. Password Changed Confirmation Template
export function renderPasswordChangedTemplate(
  ctx: BaseTemplateContext & { time?: string; ip?: string }
): { subject: string; html: string; text: string } {
  const username = ctx.username || "Architect";
  const timestamp = ctx.time || new Date().toUTCString();
  const ipAddress = ctx.ip || "Unknown IP";

  const subject = "Security Alert: Your password has been changed — DocArch Studio";
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${username}</strong>,</p>
    <p style="margin: 0 0 12px 0;">This email confirms that the password for your DocArch Studio account was successfully updated.</p>
    <div style="padding: 12px 14px; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; font-size: 12px; color: #cbd5e1;">
      <div>🕒 <strong>Time:</strong> ${timestamp}</div>
      <div style="margin-top: 4px;">🌐 <strong>IP Address:</strong> ${ipAddress}</div>
    </div>
    <p style="margin: 0; color: #f87171; font-weight: 600; font-size: 12px;">If you did NOT initiate this change, your credentials may be compromised. Please contact security administration immediately.</p>
  `;

  const html = renderBaseHtml("Password Successfully Changed", bodyContent);

  const text = `Hello @${username},

The password for your DocArch Studio account was successfully changed at ${timestamp} (IP: ${ipAddress}).

All previous login sessions have been revoked. If you did not make this change, please contact security administration immediately.`;

  return { subject, html, text };
}

// 4. Document Export Alert
export function renderExportAlertTemplate(
  ctx: BaseTemplateContext & { projectName: string; format: string }
): { subject: string; html: string; text: string } {
  const subject = `Architecture Export: "${ctx.projectName}" [${ctx.format.toUpperCase()}]`;
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${ctx.username || "Architect"}</strong>,</p>
    <p style="margin: 0 0 12px 0;">An architecture document package for project <strong>${ctx.projectName}</strong> was successfully exported in <strong>${ctx.format.toUpperCase()}</strong> format.</p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">This notification is sent in accordance with your repository export auditing preferences.</p>
  `;

  const html = renderBaseHtml("Architecture Package Exported", bodyContent);
  const text = `Project "${ctx.projectName}" exported in ${ctx.format.toUpperCase()} format by @${ctx.username || "Architect"}.`;

  return { subject, html, text };
}

// 5. Quality Audit Completed Alert
export function renderAuditAlertTemplate(
  ctx: BaseTemplateContext & { projectName: string; score: number; findingsCount: number }
): { subject: string; html: string; text: string } {
  const subject = `Architecture Review: "${ctx.projectName}" Score: ${ctx.score}/100`;
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${ctx.username || "Architect"}</strong>,</p>
    <p style="margin: 0 0 12px 0;">An automated Architecture Quality Review was completed for <strong>${ctx.projectName}</strong>:</p>
    <div style="padding: 12px 14px; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; font-size: 13px;">
      <div>📊 <strong>Architecture Score:</strong> <span style="color: ${ctx.score >= 80 ? "#34d399" : ctx.score >= 60 ? "#fbbf24" : "#f87171"}; font-weight: 700;">${ctx.score}/100</span></div>
      <div style="margin-top: 4px;">🔍 <strong>Findings Identified:</strong> ${ctx.findingsCount} issue(s)</div>
    </div>
  `;

  const html = renderBaseHtml("Architecture Review Completed", bodyContent);
  const text = `Architecture Review for "${ctx.projectName}": Score ${ctx.score}/100 with ${ctx.findingsCount} findings.`;

  return { subject, html, text };
}

// 6. ADR Change Alert
export function renderAdrAlertTemplate(
  ctx: BaseTemplateContext & { projectName: string; adrTitle: string; status: string }
): { subject: string; html: string; text: string } {
  const subject = `ADR Updated: "${ctx.adrTitle}" [${ctx.status.toUpperCase()}]`;
  const bodyContent = `
    <p style="margin: 0 0 12px 0;">Hello <strong>@${ctx.username || "Architect"}</strong>,</p>
    <p style="margin: 0 0 12px 0;">An Architecture Decision Record (ADR) was updated in project <strong>${ctx.projectName}</strong>:</p>
    <div style="padding: 12px 14px; background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; margin: 16px 0; font-size: 13px;">
      <div>📋 <strong>ADR:</strong> ${ctx.adrTitle}</div>
      <div style="margin-top: 4px;">📌 <strong>New Status:</strong> <span style="text-transform: uppercase; font-weight: 700;">${ctx.status}</span></div>
    </div>
  `;

  const html = renderBaseHtml("Architecture Decision Record Updated", bodyContent);
  const text = `ADR "${ctx.adrTitle}" in project "${ctx.projectName}" is now ${ctx.status.toUpperCase()}.`;

  return { subject, html, text };
}
