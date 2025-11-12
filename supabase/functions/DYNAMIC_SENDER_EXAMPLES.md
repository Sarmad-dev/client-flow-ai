# Dynamic Sender Address Examples

This document provides examples of how the dynamic sender address system works in the SendGrid integration.

## How Dynamic Addresses Are Generated

### User Identifier Creation

The system creates a clean, email-safe identifier from the user's information:

```javascript
function createUserEmail(userIdentifier, domain) {
  const cleanIdentifier = userIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '') // Remove special characters
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 30); // Limit length

  return `${cleanIdentifier}@${domain}`;
}
```

### Display Name Extraction

The system tries to create a friendly display name:

```javascript
function getUserDisplayName(user, fromName) {
  // Priority order:
  // 1. Provided fromName parameter
  // 2. User metadata full_name
  // 3. User metadata name
  // 4. Email username (formatted)
  // 5. Default name
}
```

## Real-World Examples

### Example 1: Business User

**Input:**

- User email: `john.doe@company.com`
- User metadata: `{ full_name: "John Doe" }`
- Domain: `nexasuit.com`

**Output:**

- Sender email: `johndoe@nexasuit.com`
- Display name: `John Doe`
- Full sender: `John Doe <johndoe@nexasuit.com>`

### Example 2: Gmail User

**Input:**

- User email: `sarah_smith123@gmail.com`
- User metadata: `{}`
- Domain: `nexasuit.com`

**Output:**

- Sender email: `sarahsmith123@nexasuit.com`
- Display name: `Sarah Smith123` (formatted from email)
- Full sender: `Sarah Smith123 <sarahsmith123@nexasuit.com>`

### Example 3: Custom From Name

**Input:**

- User email: `mike@example.com`
- User metadata: `{ full_name: "Michael Johnson" }`
- Custom from name: `Mike from Sales`
- Domain: `nexasuit.com`

**Output:**

- Sender email: `mike@nexasuit.com`
- Display name: `Mike from Sales` (custom name takes priority)
- Full sender: `Mike from Sales <mike@nexasuit.com>`

### Example 4: Complex Email Address

**Input:**

- User email: `user.with+tags@sub.domain.com`
- User metadata: `{}`
- Domain: `nexasuit.com`

**Output:**

- Sender email: `userwithtags@nexasuit.com` (cleaned)
- Display name: `User With Tags` (formatted)
- Full sender: `User With Tags <userwithtags@nexasuit.com>`

### Example 5: Long Username

**Input:**

- User email: `very.long.username.that.exceeds.limits@example.com`
- Domain: `nexasuit.com`

**Output:**

- Sender email: `verylongusernamethatexceedslim@nexasuit.com` (truncated to 30 chars)
- Display name: `Very Long Username That Exceeds Limits`

## API Request Examples

### Sending Email with Default User Identity

```javascript
// POST /functions/v1/send-email
{
  "to": "client@example.com",
  "subject": "Project Update",
  "html": "<p>Hello! Here's your project update...</p>",
  "text": "Hello! Here's your project update..."
  // No 'from' specified - uses user's email prefix
}

// Result: Sends from johndoe@nexasuit.com as "John Doe"
```

### Sending Email with Custom From Name

```javascript
// POST /functions/v1/send-email
{
  "to": "client@example.com",
  "from": "John from Marketing",
  "subject": "Marketing Campaign Results",
  "html": "<p>Here are your campaign results...</p>"
}

// Result: Sends from johndoe@nexasuit.com as "John from Marketing"
```

### Sending Email with Custom Identifier

```javascript
// POST /functions/v1/send-email
{
  "to": "client@example.com",
  "from": "support",
  "subject": "Technical Support",
  "html": "<p>We're here to help...</p>"
}

// Result: Sends from support@nexasuit.com as "Support"
```

## Database Storage

The system stores the actual sender email in the database:

```sql
INSERT INTO email_communications (
  sender_email,  -- "johndoe@nexasuit.com"
  recipient_email,
  subject,
  -- ... other fields
);
```

## Reply Handling

When recipients reply to dynamic sender addresses:

1. **Reply-To Header**: Set to user's actual email address
2. **Inbound Parse**: Can route replies based on sender address
3. **Thread Correlation**: Maintains conversation history

### Example Reply Flow

1. User sends from `johndoe@nexasuit.com`
2. Reply-To is set to `john.doe@company.com`
3. Recipient replies to the email
4. Reply goes to `john.doe@company.com` (user's actual email)
5. Optionally, inbound parse can capture replies to `johndoe@nexasuit.com`

## SendGrid Configuration Requirements

### Domain Authentication

```
Domain: nexasuit.com
Subdomain: mail (optional)
DKIM: Enabled
SPF: Enabled
```

### DNS Records Required

```
TXT record: nexasuit.com
Value: "v=spf1 include:sendgrid.net ~all"

CNAME record: s1._domainkey.nexasuit.com
Value: s1.domainkey.u1234567.wl123.sendgrid.net

CNAME record: s2._domainkey.nexasuit.com
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

### Wildcard Support

To support dynamic sender addresses, ensure your domain authentication supports wildcard subdomains or configure SendGrid to accept emails from any address at your domain.

## Benefits in Practice

### For Sales Teams

- Each salesperson sends from their own branded address
- Recipients see personal communication, not generic company emails
- Better response rates and relationship building

### For Support Teams

- Support tickets come from individual agents
- Customers can identify their specific support contact
- Improved customer experience and trust

### For Marketing

- Personalized outreach campaigns
- Higher deliverability with unique sender addresses
- Better engagement tracking per team member

## Monitoring and Analytics

### SendGrid Dashboard

- Track performance by individual sender addresses
- Monitor reputation for each user's sending pattern
- Identify high-performing team members

### Application Analytics

- User-specific email metrics
- Team performance comparisons
- Individual sender reputation tracking

## Troubleshooting

### Common Issues

1. **Domain not authenticated**: Verify DNS records
2. **Sender address rejected**: Check domain authentication
3. **Low deliverability**: Monitor sender reputation
4. **Replies not received**: Verify Reply-To configuration

### Best Practices

1. Keep user identifiers consistent
2. Use meaningful display names
3. Monitor bounce rates per sender
4. Implement proper reply handling
5. Train users on email best practices
