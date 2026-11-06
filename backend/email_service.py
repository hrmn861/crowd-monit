"""
SMTP Email Dispatch Service for Crowd Monitor Escalation Alerts.
Sends formatted tactical escalation summaries and JSON payloads to allow-listed
control room dispatch centers using Python's standard smtplib.
"""

import os
import smtplib
import json
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, List

logger = logging.getLogger("crowd_monitor.email_service")

# SMTP Configuration from Environment Variables
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "alerts@crowdmonitor.io")

# Allow-listed control room recipients (comma-separated string)
DEFAULT_RECIPIENTS = "harmanpreet7012@gmail.com,dispatch-center@crowdmonitor.io"
CONTROL_ROOM_EMAILS = [
    email.strip()
    for email in os.getenv("CONTROL_ROOM_EMAILS", DEFAULT_RECIPIENTS).split(",")
    if email.strip()
]


def send_escalation_alert_email(
    escalation_payload: Dict[str, Any],
    recipients: List[str] = None
) -> Dict[str, Any]:
    """
    Constructs and dispatches an urgent crowd surge alert email to allow-listed
    control room email addresses via SMTP (e.g. SendGrid, AWS SES, Gmail, or corporate relay).
    """
    target_recipients = recipients or CONTROL_ROOM_EMAILS
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    zone_code = escalation_payload.get("zone_code", "UNKNOWN")
    zone_name = escalation_payload.get("zone_name", "Monitored Zone")
    site_name = escalation_payload.get("site_name", "Crowd Monitor Site")
    current_count = escalation_payload.get("current_count", 0)
    density = escalation_payload.get("density_per_sqm", 0.0)
    critical_threshold = escalation_payload.get("critical_threshold", 0)
    exceeded_by = escalation_payload.get("exceeded_by", 0)
    operator_notes = escalation_payload.get("operator_notes", "Urgent tactical review required.")
    measures = escalation_payload.get("recommended_measures", [])

    subject = f"🚨 [CROWD SURGE ALERT] Zone {zone_code} ({zone_name}) Exceeded Threshold by +{exceeded_by} pax"

    # Plain text version
    text_content = f"""
================================================================================
CROWD MONITOR | CRITICAL ESCALATION DISPATCH
================================================================================
Site:                {site_name}
Viewpoint:           {escalation_payload.get('viewpoint', 'TSQ-CAM-01')}
Zone:                {zone_code} - {zone_name}
Current Count:       {current_count} persons
Critical Threshold:  {critical_threshold} persons (Exceeded by +{exceeded_by})
Density:             {density:.2f} people/m²
Timestamp:           {now_str}

OPERATOR DISPATCH NOTES:
{operator_notes}

RECOMMENDED ACTION PROTOCOLS:
"""
    for m in measures:
        text_content += f"  - {m}\n"

    text_content += f"""
FULL ESCALATION PAYLOAD (JSON):
{json.dumps(escalation_payload, indent=2)}

--------------------------------------------------------------------------------
This is an automated tactical broadcast from Crowd Monitor Control Room Services.
"""

    # Rich HTML version for modern email clients
    measures_html = "".join([f"<li style='margin-bottom: 6px;'>{m}</li>" for m in measures])
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px; }}
    .container {{ max-width: 650px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }}
    .header {{ background-color: #7f1d1d; border-bottom: 2px solid #ef4444; padding: 18px 24px; }}
    .header h1 {{ margin: 0; font-size: 18px; color: #fef2f2; letter-spacing: 0.5px; text-transform: uppercase; }}
    .content {{ padding: 24px; }}
    .metric-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }}
    .metric-card {{ background-color: #27272a; padding: 14px; border-radius: 6px; border: 1px solid #3f3f46; }}
    .metric-label {{ font-size: 11px; text-transform: uppercase; color: #a1a1aa; font-family: monospace; }}
    .metric-value {{ font-size: 20px; font-weight: bold; color: #ffffff; margin-top: 4px; }}
    .metric-value.critical {{ color: #ef4444; }}
    .protocols {{ background-color: #1c1917; border-left: 4px solid #f97316; padding: 16px; border-radius: 4px; margin: 20px 0; }}
    .protocols h3 {{ margin-top: 0; color: #fdba74; font-size: 14px; }}
    .json-box {{ background-color: #09090b; border: 1px solid #27272a; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 11px; color: #e4e4e7; overflow-x: auto; white-space: pre-wrap; }}
    .footer {{ padding: 16px 24px; background-color: #09090b; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 URGENT CROWD SURGE ESCALATION DISPATCH</h1>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 14px; color: #d4d4d8;">
        An operator-confirmed crowd surge threshold has been breached at <strong>{site_name}</strong>.
      </p>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Zone Code / Name</div>
          <div class="metric-value">{zone_code} ({zone_name})</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Observed Count / Threshold</div>
          <div class="metric-value critical">{current_count} pax <span style="font-size: 13px; color: #a1a1aa;">/ {critical_threshold} max</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Density (People / m²)</div>
          <div class="metric-value">{density:.2f} p/m²</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Threshold Exceeded By</div>
          <div class="metric-value critical">+{exceeded_by} pax</div>
        </div>
      </div>

      <div class="protocols">
        <h3>Tactical Action Measures (Immediate Dispatch)</h3>
        <ul style="padding-left: 20px; margin: 0; font-size: 13px; color: #e4e4e7;">
          {measures_html}
        </ul>
      </div>

      <div style="margin-top: 20px;">
        <div style="font-size: 12px; font-weight: bold; color: #a1a1aa; margin-bottom: 6px;">Escalation Summary Payload</div>
        <div class="json-box">{json.dumps(escalation_payload, indent=2)}</div>
      </div>
    </div>
    <div class="footer">
      Sent by Crowd Monitor Tactical Operations Engine to allow-listed control room addresses: {', '.join(target_recipients)}
    </div>
  </div>
</body>
</html>
"""

    # If live SMTP host is specified in environment, deliver via smtplib
    if SMTP_HOST and SMTP_USER:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = SMTP_FROM_EMAIL
            msg["To"] = ", ".join(target_recipients)

            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            logger.info("Connecting to SMTP server at %s:%d...", SMTP_HOST, SMTP_PORT)
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10.0)
            server.ehlo()
            if SMTP_PORT in (587, 25):
                server.starttls()
                server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, target_recipients, msg.as_string())
            server.quit()

            logger.info("✓ Successfully dispatched escalation email via SMTP to: %s", ", ".join(target_recipients))
            return {
                "status": "delivered_via_smtp",
                "smtp_host": SMTP_HOST,
                "recipients": target_recipients,
                "timestamp": now_str,
                "subject": subject
            }

        except Exception as e:
            logger.error("Failed to dispatch live SMTP email: %s. Falling back to local dispatch log.", e)

    # Clean simulated fallback when SMTP credentials are not configured in environment
    logger.info("\n" + "=" * 70)
    logger.info("📧 [SMTP EMAIL DISPATCH] Tactical Escalation Sent to Control Room")
    logger.info("=" * 70)
    logger.info("From:       %s", SMTP_FROM_EMAIL)
    logger.info("To:         %s", ", ".join(target_recipients))
    logger.info("Subject:    %s", subject)
    logger.info("Zone:       %s (%s)", zone_code, zone_name)
    logger.info("Count:      %d pax (Exceeded by +%d)", current_count, exceeded_by)
    logger.info("Notice:     Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env for live relay.")
    logger.info("=" * 70 + "\n")

    return {
        "status": "simulated_dispatch",
        "recipients": target_recipients,
        "from": SMTP_FROM_EMAIL,
        "timestamp": now_str,
        "subject": subject,
        "notice": "Simulated delivery logged. Configure SMTP_HOST & SMTP_USER for live email relay."
    }
