---
applyTo: "app/api/submit/**,app/api/verify-parent/**,app/api/profile/**"
---
For age < 18, set visible = false until parent consent verified. Log IP and user-agent to parent_consents and audit_log. Reject submissions where honeypot field is filled.
