# BTL Management -- Email Sequences

## Compliance Notice

**PECR COMPLIANT:** These emails are ONLY sent to Ltd/LLP entities. Sole traders and individuals must NOT receive unsolicited email. The Privacy and Electronic Communications Regulations (PECR) entity type gate in `scripts/lib/export-filters.js` enforces this at export time via `pecrEmailGate()`.

**Current status:** 3 email leads available. Instantly.ai setup deferred until 50+ email leads. These can be sent manually or loaded into Instantly.ai when ready.

---

## Email 1: EPC Compliance Hook (Day 0)

### Subject Line Options (A/B Test)

- **A:** "Your [EPC rating]-rated property at [property address]"
- **B:** "EPC regulations are changing -- is your rental ready?"

### From

Sam Bradbury, SJB Property Group

### Body

Hi [Name],

I'm writing because your property at [property address] currently holds an Energy Performance Certificate (EPC) rating of [EPC rating]. With the government's proposed minimum EPC C requirement by 2030, landlords with D-G rated properties face significant upgrade costs or potential inability to let.

I'm Sam Bradbury, founder of SJB Property Group. We specialise in hands-off property management for landlords across Greater Manchester.

We help landlords navigate compliance requirements, manage tenants, and protect their rental income -- all for 10% of monthly rent. No long tie-in, no hidden fees.

If you'd like to know more about how we can help with your property at [property address], just reply to this email or visit sjbpropertygroup.com.

Best regards,

**Sam Bradbury**
SJB Property Group
sam@sjbproperty.com | sjbpropertygroup.com

---

*You're receiving this email because [Company Name] is listed as the owner of rental property in our target area. View our privacy policy: sjbpropertygroup.com/landlord-privacy-policy. To opt out: reply "unsubscribe" or email sam@sjbproperty.com with the subject "Opt Out".*

---

## Email 2: Social Proof (Day 3)

### Subject Line Options (A/B Test)

- **A:** "How we saved a Stockport landlord 40+ hours this year"
- **B:** "Zero voids across 7 properties -- here's how"

### From

Sam Bradbury, SJB Property Group

### Body

Hi [Name],

Since 2019, we've built a portfolio of 7 managed properties across Greater Manchester. Our track record speaks for itself:

- **100% rent collection record**
- **Zero void months in 2025**
- **7+ successful property deals completed**
- **Portfolio value over GBP1.7 million under management**

One of our landlords in Stockport was spending 15+ hours a month dealing with tenant issues, maintenance calls, and compliance paperwork. Since handing management to us, they haven't had a single call about their property.

Whether you have one property or five, our service is the same: full management, full transparency, 10% fee, no tie-in.

Would a quick 15-minute call be useful? I can walk you through exactly what we'd handle for your property at [property address]. Just reply with a time that works.

Best regards,

**Sam Bradbury**
SJB Property Group
sam@sjbproperty.com | sjbpropertygroup.com

---

*You're receiving this email because [Company Name] is listed as the owner of rental property in our target area. View our privacy policy: sjbpropertygroup.com/landlord-privacy-policy. To opt out: reply "unsubscribe" or email sam@sjbproperty.com with the subject "Opt Out".*

---

## Email 3: Direct CTA (Day 8)

### Subject Line Options (A/B Test)

- **A:** "Quick question about [property address]"
- **B:** "Last thing on your [area] rental"

### From

Sam Bradbury, SJB Property Group

### Body

Hi [Name],

I've sent a couple of emails about your rental property at [property address]. I know landlords are busy, so I'll keep this brief.

If there was one thing about managing your property that you'd love to hand off to someone else, what would it be?

We handle everything -- tenant finding, rent collection, maintenance, compliance, inspections -- so our landlords don't have to. 10% of rent, no tie-in, cancel with 2 months' notice.

If you'd like to explore this, I'm happy to jump on a free 15-minute call -- just reply to this email with a time that works. If not, no worries at all -- I won't follow up again unless you reach out.

Best regards,

**Sam Bradbury**
SJB Property Group
sam@sjbproperty.com | sjbpropertygroup.com

---

*You're receiving this email because [Company Name] is listed as the owner of rental property in our target area. View our privacy policy: sjbpropertygroup.com/landlord-privacy-policy. To opt out: reply "unsubscribe" or email sam@sjbproperty.com with the subject "Opt Out".*

---

## Merge Fields Reference

| Placeholder | Description | Source |
|-------------|-------------|--------|
| [Name] | Landlord name or director name | Database `name` field or enrichment `director_name` |
| [Company Name] | Company name (for Ltd/LLP entities) | Database `name` field (entity_type = Ltd or LLP) |
| [Director Name] | Director name from Companies House enrichment | Enrichment data |
| [property address] | First property address associated with landlord | Database property records |
| [EPC rating] | Worst EPC rating across their properties | MIN(current_energy_rating) from EPC data |
| [area] | Postcode area name | Derived from postcode (e.g. "Stockport", "South Manchester") |

---

## Sending Notes

### PECR Compliance Gate

- **Ltd/LLP entities only** -- enforced by `pecrEmailGate()` in `scripts/lib/export-filters.js`
- Sole traders and individuals must NOT receive unsolicited email under PECR
- This is a legal requirement, not a preference

### Suppression

- Run suppression check before every send via `suppressionFilter()` in `scripts/lib/export-filters.js`
- If a recipient replies "unsubscribe", add them to the suppression list immediately via `scripts/suppress-lead.js`
- Suppression applies across ALL channels (email, post, phone, LinkedIn)

### Sending Infrastructure

- Send from a secondary domain (not sjbproperty.com) once Instantly.ai is configured -- protects primary domain reputation
- Until Instantly.ai is set up, send manually from sam@sjbproperty.com to the 3 available leads
- Track opens and replies when Instantly.ai is configured
- Warm up sending domain for at least 2 weeks before scaling volume

### Sequence Timing

| Email | Day | Trigger |
|-------|-----|---------|
| Email 1: EPC Hook | Day 0 | Initial send |
| Email 2: Social Proof | Day 3 | 3 days after Email 1 |
| Email 3: Direct CTA | Day 8 | 5 days after Email 2 |

- If recipient replies at any point, stop the sequence and respond personally
- If recipient unsubscribes at any point, stop immediately and suppress

---

*BTL Management Email Sequences v1.0 -- April 2026*
