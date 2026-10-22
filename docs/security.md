# Cybersecurity & SSRF Defense Architecture

PulseCloud monitors arbitrary user-provided HTTP/HTTPS endpoints. Monitoring internal or third-party webhooks presents severe Server-Side Request Forgery (SSRF) and network probing risks if unmitigated. This document details our defensive measures.

## 1. SSRF Mitigation Matrix

| Attack Vector | Defense Mechanism |
|---|---|
| **Loopback Scanning (`127.0.0.1`, `localhost`, `::1`)** | Checked via `ipaddress.is_loopback` and strict host validation. Blocked by default. |
| **RFC1918 Private Network Introspection (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)** | Evaluated via `ipaddress.is_private`. Connections denied unless in explicit allowlist. |
| **Cloud Metadata Theft (`169.254.169.254`, `169.254.0.0/16`)** | Checked via `ipaddress.is_link_local` and subnet prefix matches. Strictly forbidden. |
| **DNS Rebinding & Time-Of-Check to Time-Of-Use (TOCTOU)** | Hostname resolution performed before dispatch (`socket.getaddrinfo`), validating every resolved IP address. |
| **Arbitrary Protocol Exploitation (`file://`, `gopher://`, `ftp://`)** | Scheme whitelist: Only `http://` and `https://` permitted. |
| **Embedded Credential Leaks (`http://user:pass@host`)** | Authority component sanitized; URLs with userinfo rejected. |
| **Response Memory Exhaustion (Zip Bombs / Gigabyte Payloads)** | Response reading bounded to `settings.MAX_RESPONSE_BODY_BYTES` (10KB limit). Large payload streaming disabled. |

## 2. Authentication & Authorization

- **JWT Tokens**: Cryptographically signed using `HS256` with configurable `SECRET_KEY` and UTC expiry timestamps.
- **Password Protection**: Passwords salted and hashed with `bcrypt`.
- **Role-Based Access Control (RBAC)**:
  - `admin`: Global administrative operations and full cluster visibility.
  - `user`: Scoped visibility limited strictly to owned endpoints, checks, and reports.
- **Sanitized Logging**:
  - Authorization headers, API keys, bearer tokens, and session cookies are excluded from check result logs and database storage.

## 3. Safe Allowlist Configuration

In controlled development or testing environments, local loopback targets (such as PulseCloud's built-in mock endpoints `http://127.0.0.1:8000/api/v1/mock-targets/*`) can be allowed by listing them in `SSRF_ALLOWLIST_HOSTS`. Any unlisted private IP address remains strictly blocked.
