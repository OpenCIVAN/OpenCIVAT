# Thumbnail System Integration Guide (Server-Authoritative)

## Security Architecture

This thumbnail system follows a **server-authoritative** model where the server has complete control over thumbnail generation. The client can only fetch existing thumbnails and listen for notifications when new thumbnails are ready.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER-AUTHORITATIVE MODEL                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SERVER DECIDES WHEN TO GENERATE:                                           │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐          │
│  │ File Upload │────▶│ thumbnailService│────▶│ Thumbnail Worker │          │
│  │ View Create │     │ .queueJob()     │     │ (Headless Chrome)│          │
│  │ View Update │     └─────────────────┘     └────────┬─────────┘          │
│  │ Cron Job    │                                      │                     │
│  └─────────────┘                                      ▼                     │
│                                              ┌─────────────────┐            │
│                                              │     MinIO       │            │
│                                              │ (Thumbnail PNG) │            │
│                                              └────────┬────────┘            │
│                                                       │                     │
│                                              ┌────────▼────────┐            │
│  CLIENT CAN ONLY:                            │   WebSocket     │            │
│  ┌─────────────────────────────┐             │  "thumb:ready"  │            │
│  │ GET /views/:id/thumbnail    │◀────────────┴─────────────────┘            │
│  │ (Fetch existing thumbnail)  │                                            │
│  └─────────────────────────────┘                                            │
│                                                                             │
│  CLIENT CANNOT:                                                             │
│  ✗ Upload thumbnails                                                        │
│  ✗ Request/trigger generation                                               │
│  ✗ Influence when thumbnails are captured                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```