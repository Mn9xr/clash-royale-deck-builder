# Security Policy

## Supported Versions

This project is currently a local-first side project and does not yet have formal version support.

At the moment, security fixes will generally be applied to the latest version of the project only.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | Yes                |
| Older   | No                 |

---

## Reporting a Vulnerability

If you find a security issue, please do **not** open a public GitHub issue with full exploit details.

Instead, report it privately by contacting me directly through GitHub or another private channel if available.

When reporting a vulnerability, please include:
- a clear description of the issue
- steps to reproduce it
- the potential impact
- screenshots or proof of concept if helpful
- any suggested fix, if you have one

I will try to:
- review the report as soon as possible
- confirm whether the issue is valid
- fix serious issues in the latest version of the project
- avoid publicly exposing sensitive details before a fix is available

---

## Scope

Please report issues related to:
- exposed API keys or secrets
- authentication or authorization problems
- unsafe handling of user input
- server-side vulnerabilities
- sensitive local data leakage
- dependency-related security risks
- accidental exposure of private configuration files

Examples for this project may include:
- Clash Royale API token exposure
- unsafe backend API routes
- unsanitized player tag input
- local profile or saved data leakage
- accidental inclusion of secrets in the repo

---

## Out of Scope

The following are generally out of scope:
- issues requiring physical access to the local machine
- problems caused only by unsupported or modified local environments
- theoretical issues without a realistic security impact
- UI bugs with no security impact
- rate limit or performance complaints that are not security-related

---

## Security Notes

Because this project is currently a local-first side project, some parts may still be evolving.

Basic security goals for this project include:
- keeping API tokens server-side only
- not exposing secrets in frontend code
- validating and sanitizing user input
- avoiding committing `.env` files or private credentials
- improving security as the project grows

---

## Disclosure

Please allow reasonable time for a fix before publicly disclosing any serious vulnerability.

Responsible disclosure is appreciated.
