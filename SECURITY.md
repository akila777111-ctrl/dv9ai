# Security Policy

DV9AI handles automation, webhook and optional AI-provider integrations. Security reports are treated as high priority.

## Reporting a vulnerability

Please do **not** open a public issue for vulnerabilities, leaked credentials, authentication bypasses or sensitive deployment details.

Preferred reporting path:

1. Use GitHub's private security reporting / Security Advisory flow for this repository when available.
2. If that is unavailable, contact the primary maintainer through the GitHub profile and request a private reporting channel.

Include only the minimum evidence required to reproduce the issue. Do not post live secrets.

## Credential exposure

If a secret is suspected to have been exposed, treat it as compromised immediately:

- revoke or rotate the credential at the provider;
- update the deployment secret store;
- redeploy if required;
- verify that logs and diagnostics do not disclose the new value;
- remove the value from the current tree and, when necessary, clean repository history.

Deleting a secret from the latest commit is not sufficient if it remains in Git history.

## Supported security model

The project aims to preserve these defaults:

- sensitive values are server-side only;
- public/browser variables must not contain secrets;
- authorization ambiguity fails closed;
- paid or sensitive AI runtime calls require explicit activation;
- preview environments must not silently enable paid provider calls;
- diagnostics expose state, not credential values.

## Public-repository rule

Before publishing deployment material, verify that it contains no credentials, private keys, session material, personal identifiers or confidential infrastructure details.
