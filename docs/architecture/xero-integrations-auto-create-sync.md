# Xero Integrations (Auto-Creation & Sync)

- **Bank Account Auto-Create**: Two-way synchronization between PayTrade and Xero for bank accounts, with hourly schedulers and manual sync options.
- **Contact Auto-Create**: Two-way synchronization for contacts, supporting individual and batch creation with type determination (Client/Supplier) from Xero data.
- **Smart Contract Auto-Creation**: Automatically creates contracts from Xero claims (invoices/bills) based on predefined logic and defaults when no existing contract matches. Validation consolidates all missing fields (Address, Email, bank details, PTA/RTA accounts) into a single error message.
- **Project & Contract Auto-Create**: Two-way synchronization for projects and contracts, mapping them to Xero tracking categories, with individual and batch creation options.
- **Manual Contact Financial Sync**: On-demand synchronization of financial details for mapped contacts.
- **Manual Contact Information Sync**: On-demand synchronization of address, phone, and email from Xero to PayTrade for all mapped contacts, with a dedicated "SYNC CONTACT INFO" button alongside "SYNC FINANCIAL DETAILS".
- **Webhook Contact Detail Sync**: Real-time sync of address (PO Box/Street), phone (Mobile/Default), and email from Xero when contacts are updated, in addition to name and email.
- **Sync Log Summary Dashboard Widget**: Displays a summary of recent Xero sync activity on the user dashboard, with colour-coded status breakdown (Synced/Warnings/Failed) and the 10 most recent sync log entries.
- **Webhook Fallback Scheduler**: Cron-scheduled (every 15 min) fallback that polls Xero API for recently modified invoices and contacts, compares against tracked records in `xero_invoices_bills` and `xero_contact_details`, and processes any gaps missed by webhooks. Uses `sync_run_type: 'fallback'` to distinguish from webhook-triggered syncs.
