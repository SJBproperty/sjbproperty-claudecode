# Data Retention Policy — Landlord Lead Data

## SJB Property Group Ltd

### Document Control

| Field | Detail |
|-------|--------|
| Version | 1.0 |
| Date | 2026-03-31 |
| Next review | 2027-03-31 |

---

### Scope

This policy applies to all personal data collected as part of SJB Property Group's landlord lead generation pipeline, including data sourced from the EPC Register, Companies House, Land Registry CCOD, council HMO licensing registers, and OpenRent.

---

### Retention Periods

| Data Category | Retention Period | Review Trigger |
|---------------|-----------------|----------------|
| Landlord lead data (name, address, EPC, contact details) | 12 months from collection | No engagement after 12 months — delete |
| Suppressed leads (opt-out records) | Indefinite | Suppression records must be retained permanently to prevent re-contacting |
| Business relationship data (signed management clients) | Duration of relationship + 6 years | Legal and tax retention requirements (HMRC) |
| Property data (address, EPC rating, HMO status) | Retained independently | Anonymised — no landlord link after lead data deletion |

---

### Review process

Every 12 months, all lead records are reviewed against the following criteria:

**Delete the record if:**

- No email has been opened or responded to
- No direct mail response received
- No phone contact made or returned
- No consultation booked or attended
- No management agreement in place

**Retain the record if:**

- Active communication exists (email replies, phone calls, meetings)
- A consultation has been scheduled or completed
- A management agreement or business relationship is in place
- The landlord has expressed interest but requested follow-up at a later date

---

### Deletion process

When a lead record is due for deletion:

1. The landlord record is deleted from the SQLite database (name, contact details, entity information)
2. Associated property records are retained in anonymised form (no landlord link) for market analysis purposes
3. Suppression records are **NEVER** deleted — the landlord's name and suppression reason are retained permanently to prevent re-contacting
4. Corresponding Notion CRM entries are archived or deleted to match the database state

---

### Suppression Records

Suppression records serve a critical compliance function and are exempt from the 12-month retention review:

- **What is retained:** Landlord name, suppression date, suppression reason, suppression channel
- **Why retained permanently:** To ensure that a landlord who has opted out is never re-contacted, even if their data appears again in a future data refresh from public sources
- **Scope:** Universal — a suppression on any channel (email, post, phone, LinkedIn) suppresses all channels

---

### Responsibilities

| Role | Responsibility |
|------|---------------|
| Data controller (Sam Bradbury) | Conduct 12-month review, authorise deletions, maintain suppression list |
| Export scripts | Automatically exclude suppressed leads from all outreach lists |
| Data refresh processes | Check new records against suppression list before adding to active pipeline |

---

*Data Retention Policy version 1.0 — 2026-03-31*
*Next review: 2027-03-31*
