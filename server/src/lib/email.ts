import sgMail from "@sendgrid/mail";
import { ENV } from "../config/env.js";

const FROM_EMAIL = ENV.SENDGRID_FROM_EMAIL || "noreply@nexus.app";

if (ENV.SENDGRID_API_KEY) {
  sgMail.setApiKey(ENV.SENDGRID_API_KEY);
}

export interface WorkspaceInviteEmailParams {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date | null;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildWorkspaceInviteHtml(
  params: WorkspaceInviteEmailParams,
): string {
  const {
    workspaceName,
    inviterName,
    inviteUrl,
    expiresAt,
  } = params;

  const expiryText = expiresAt
    ? `This invitation expires on ${expiresAt.toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    )}.`
    : "This invitation does not expire.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:40px 40px 24px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
                Nexus
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                You're invited to ${escapeHtml(workspaceName)}
              </h2>

              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                ${escapeHtml(inviterName)}
                has invited you to join
                <strong>${escapeHtml(workspaceName)}</strong>
                on Nexus.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center">
                    <a
                      href="${escapeHtml(inviteUrl)}"
                      style="
                        display:inline-block;
                        padding:14px 32px;
                        font-size:15px;
                        font-weight:600;
                        color:#ffffff;
                        background:linear-gradient(135deg,#6366f1,#8b5cf6);
                        border-radius:8px;
                        text-decoration:none;
                      "
                    >
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                ${escapeHtml(expiryText)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Nexus — Team Communication Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWorkspaceInviteEmail(
  params: WorkspaceInviteEmailParams,
): Promise<void> {
  if (!ENV.SENDGRID_API_KEY) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  try {
    const msg = {
      to: params.to,
      from: FROM_EMAIL,
      subject: `You're invited to join ${params.workspaceName} on Nexus`,
      html: buildWorkspaceInviteHtml(params),
    };

    const [response] = await sgMail.send(msg);

    const messageId = response.headers?.["x-message-id"] ?? "unknown";

    console.log(
      `[email] ✓ Accepted by SendGrid  to=${params.to}  messageId=${messageId}`,
    );

    if (response.statusCode !== 202) {
      console.warn(
        `[email] Unexpected SendGrid status code: ${response.statusCode}`,
      );
    }
  } catch (error: any) {
    const sendGridError =
      error?.response?.body ??
      error?.response ??
      error;

    console.error(
      `[email] ✗ SendGrid rejected  to=${params.to}`,
      JSON.stringify(sendGridError, null, 2),
    );

    throw new Error("EMAIL_SEND_FAILED");
  }
}