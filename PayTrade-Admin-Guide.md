# PayTrade Admin Panel Guide

A comprehensive guide to all admin panel features, pages, and actions in the PayTrade platform.

---

## Admin Authentication
**URL:** `/admin/login`

Admin accounts are stored separately in the `admin_details` table (not `user_details`).

## Admin Dashboard
**URL:** `/admin/dashboard`

**Widgets:**
- New Users count
- New Businesses count
- Notices pending
- Compliance issues
- Failed subscription transactions
- Trust accounting issues
- Quick access to all admin sections

## User & Business Management

| Page | URL | Description |
|------|-----|-------------|
| **Manage Users** | `/admin/users` | List, search, filter all platform users |
| **Add User** | `/admin/users/add` | Create a new user account |
| **Edit User** | `/admin/users/edit/[id]` | Update user details, block/unblock |
| **Manage Businesses** | `/admin/business` | List all business profiles |
| **Add Business** | `/admin/business/add` | Create a new business profile |
| **Edit Business** | `/admin/business/edit/[id]` | Update business details |

**User Management Actions:**
- Edit user details
- Mark as contacted/uncontacted
- Block/unblock users
- Reset password (sends new password via email)
- Login as user (Super Admin only, requires admin password)
- Enable/disable free premium access
- **Generate Bot Users** (creates AI-generated bot user personas)

## Admin Users (Internal)

| Page | URL | Description |
|------|-----|-------------|
| **Admin Users List** | `/admin/admin-users` | List all admin accounts |
| **Add Admin User** | `/admin/admin-users/add` | Create a new admin |
| **Edit Admin User** | `/admin/admin-users/edit/[id]` | Update admin details |

## Community Management

| Page | URL | Description |
|------|-----|-------------|
| **Discussions** | `/admin/community/discussions` | Manage all discussions |
| **Product Ideas** | `/admin/community/product-ideas` | Manage all product ideas |
| **Reported Content** | `/admin/community/discussions/reported/[id]` | Review flagged content |
| **Comments** | `/admin/community/discussions/comments/[id]` | Manage answers/comments |

**Community Admin Actions:**
- View, delete discussions and product ideas
- Review and moderate reported content
- View archived (deleted) comments
- **Generate Bot Question** (creates AI-generated Q&A discussion)
- **Generate Bot Answers** (creates AI-generated answers for a specific discussion)

## Content Management

| Page | URL | Description |
|------|-----|-------------|
| **FAQ List** | `/admin/content-management/faq` | Manage FAQ entries |
| **Add FAQ** | `/admin/content-management/faq/add` | Create new FAQ |
| **Edit FAQ** | `/admin/content-management/faq/edit/[id]` | Update FAQ |
| **Email Templates** | `/admin/content-management/email` | View/edit system email templates |

## Blog Management

| Page | URL | Description |
|------|-----|-------------|
| **Blog List** | `/admin/blog` | List all blog posts |
| **Edit Blog Post** | `/admin/blog/edit/[id]` | Create/update blog articles |

## Resource Guides

| Page | URL | Description |
|------|-----|-------------|
| **Resource List** | `/admin/resource` | List resource articles |
| **Add Resource** | `/admin/resource/add` | Create new resource |
| **Edit Resource** | `/admin/resource/edit/[id]` | Update resource |

## How-to Guides

| Page | URL | Description |
|------|-----|-------------|
| **Guides List** | `/admin/how-to-guides` | List how-to guides |
| **Add Guide** | `/admin/how-to-guides/add` | Create new guide |
| **Edit Guide** | `/admin/how-to-guides/edit/[id]` | Update guide |

## SEO Keywords
**URL:** `/admin/seo-keywords`

**Actions:**
- Add/edit/delete SEO keywords
- Configure landing page metadata (title, description, H1, content)
- Keywords drive dynamic `/topics/[slug]` pages
- Active keywords feed into community bot topic selection
- Included in sitemap generation

## Communication Management

| Page | URL | Description |
|------|-----|-------------|
| **Communication List** | `/admin/communication` | View all admin communications |
| **Add Communication** | `/admin/communication/add` | Create and send system-wide emails |
| **View Communication** | `/admin/communication/view/[id]` | View sent communication details |

## Notices (Admin View)

| Page | URL | Description |
|------|-----|-------------|
| **Current Notices** | `/admin/notices/current` | View active notices across all users |
| **Archived Notices** | `/admin/notices/archive` | View historical notices |
| **View Notice** | `/admin/notices/view/[id]` | Detailed notice view |

## Compliance (Admin View)

| Page | URL | Description |
|------|-----|-------------|
| **Compliance Overview** | `/admin/compliances` | Platform-wide compliance dashboard |
| **Manage Compliances** | `/admin/manage-compliances` | Configure compliance rules |

## Subscription & Billing Management

| Page | URL | Description |
|------|-----|-------------|
| **Current Plans** | `/admin/subscriptions/current` | Active subscription plans |
| **Archived Plans** | `/admin/subscriptions/archived` | Inactive plans |
| **Add Plan** | `/admin/subscriptions/add` | Create new subscription plan |
| **Edit Plan** | `/admin/subscriptions/edit/[id]` | Update plan details and pricing |
| **View Plan** | `/admin/subscriptions/view/[id]` | View plan details |
| **Manage Items** | `/admin/subscriptions/manage-items/current` | Plan feature items (current) |
| **Archived Items** | `/admin/subscriptions/manage-items/archived` | Inactive items |
| **Add Item** | `/admin/subscriptions/manage-items/add` | Create new plan item |
| **Edit Item** | `/admin/subscriptions/manage-items/edit/[id]` | Update item |
| **Manage Coupons** | `/admin/subscriptions/manage-coupons/current` | Active discount codes |
| **Archived Coupons** | `/admin/subscriptions/manage-coupons/archived` | Expired coupons |
| **Add Coupon** | `/admin/subscriptions/manage-coupons/add` | Create Stripe coupon |
| **Edit Coupon** | `/admin/subscriptions/manage-coupons/edit/[id]` | Update coupon |
| **Subscription Profiles** | `/admin/subscriptions/manage-profiles` | View user subscription status |
| **Billing History** | `/admin/subscriptions/billing-history` | All transactions, failed payments |

## System Configuration (Masters)

| Page | URL | Description |
|------|-----|-------------|
| **Masters List** | `/admin/masters` | Global dropdown values and constants |
| **Edit Master** | `/admin/masters/edit/[id]` | Update master value |
| **Currency List** | `/admin/currency` | Supported currencies |
| **Edit Currency** | `/admin/currency/edit/[id]` | Update currency details |
| **Financial Institutions** | `/admin/financial-institution` | Bank/institution details |
| **Edit Institution** | `/admin/financial-institution/edit/[id]` | Update institution |
| **Holidays** | `/admin/holidays` | Public holidays affecting payment deadlines |
| **Add Holiday** | `/admin/holidays/add` | Create holiday entry |
| **Edit Holiday** | `/admin/holidays/edit/[id]` | Update holiday |
| **View Holiday** | `/admin/holidays/view/[id]` | View holiday details |
| **Delegation** | `/admin/delegation` | QBCC regulatory delegation settings |

## Groups & Permissions
**URL:** `/admin/groups`

**Actions:**
- Define user groups with granular permissions
- Set permissions per module: View, Insert, Update, Delete, Print, Export
- Assign groups to admin users

## Admin Journal & Trust Accounting

| Page | URL | Description |
|------|-----|-------------|
| **Journals** | `/admin/journals` | Platform-wide journal overview |
| **Trust Accounting** | `/admin/journals/trust-accounting` | Trust account oversight |

## Admin Settings

| Page | URL | Description |
|------|-----|-------------|
| **Personal Info** | `/admin/personal-info` | Admin profile management |
| **Sign-in & Security** | `/admin/sign-in-security` | Password and security settings |
| **Activity Log** | `/admin/activity-log` | Full audit trail of admin actions |

---

*Admin functions are managed by portal administrators. The admin panel is separate from the user-facing application and requires admin credentials to access.*
