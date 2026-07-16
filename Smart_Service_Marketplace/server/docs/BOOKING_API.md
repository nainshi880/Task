# Booking Module API (Part 4)

Base URL: `/api/v1`

Auth: `Authorization: Bearer <JWT>`

## Customer
| Method | Path | Description |
|--------|------|-------------|
| POST | `/bookings` | Create booking |
| GET | `/bookings` | List my bookings |
| GET | `/bookings/:id` | Get booking |
| PUT | `/bookings/:id` | Update (Pending/Assigned) |
| PATCH | `/bookings/:id/cancel` | Cancel |
| POST | `/bookings/:id/images` | Upload issue images |
| PATCH | `/bookings/:id/confirm-completion` | Confirm completion |
| PATCH | `/bookings/:id/close` | Close booking |

## Technician
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings/technician/me` | My jobs |
| PATCH | `/bookings/:id/accept` | Accept |
| PATCH | `/bookings/:id/reject` | Reject → Pending |
| PATCH | `/bookings/:id/start` | Start work |
| POST | `/bookings/:id/completion-images` | Upload proof |
| PATCH | `/bookings/:id/complete` | Complete |

## Admin — Assignment
| Method | Path | Description |
|--------|------|-------------|
| POST | `/bookings/:id/assign/auto` | Auto assign |
| POST | `/bookings/:id/assign` | Manual assign |
| GET | `/bookings/:id/assign/preview` | Rank candidates |
| GET | `/technicians/available` | Available technicians |

## Admin — Search & Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings/search?q=` | Search |
| GET | `/bookings/filter` | Filter |
| GET | `/bookings/admin/list` | List |
| GET | `/bookings/analytics/dashboard` | Analytics (cached) |

## Timeline / History / Audit
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings/:id/timeline` | Chronological events |
| GET | `/bookings/:id/history` | History (newest first) |
| GET | `/bookings/:id/audit-logs` | Audit logs (admin) |

## Interactive docs
Swagger UI: `/api/docs`  
OpenAPI JSON: `/api/docs.json`

## Production notes
- MongoDB transactions used for assign/reject (falls back if no replica set)
- Redis cache via `REDIS_URL` (optional; in-memory fallback)
- Cloudinary uploads retry with exponential backoff
- Booking write rate limit: 40 / 15 min
- Booking search rate limit: 30 / min
