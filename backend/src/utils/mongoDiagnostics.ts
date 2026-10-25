export function describeMongoConnectionError(error: unknown): string {
  const messages: string[] = [];
  const pending: unknown[] = [error];
  const seen = new Set<object>();

  while (pending.length > 0 && seen.size < 100) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);

    const candidate = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      cause?: unknown;
      reason?: unknown;
      errors?: unknown;
      servers?: unknown;
      error?: unknown;
      description?: unknown;
      topologyDescription?: unknown;
    };

    messages.push(String(candidate.name ?? ''), String(candidate.message ?? ''), String(candidate.code ?? ''));
    pending.push(candidate.cause, candidate.reason, candidate.errors, candidate.servers, candidate.error, candidate.description, candidate.topologyDescription);

    if (current instanceof Map) {
      pending.push(...current.values());
    } else if (Array.isArray(current)) {
      pending.push(...current);
    } else {
      for (const [key, value] of Object.entries(current)) {
        if (/error|cause|reason|server|topology|description|message|code/i.test(key)) {
          pending.push(value);
        }
      }
    }
  }

  const details = messages.join(' ').toLowerCase();
  if (/authenticationfailed|authentication|auth failed|bad auth|code 18|code: 18/.test(details)) {
    return 'Atlas rejected authentication. Check the Database User credentials and URL-encode special characters in the password.';
  }
  if (/not authorized|ip access list|ip address.*not|whitelist|allow.?list|not authorized from this ip/.test(details)) {
    return 'Atlas explicitly denied the client IP. Add this PC public IP to Atlas Network Access.';
  }
  if (/querysrv|enotfound|eai_again|dns|srv/.test(details)) {
    return 'Atlas DNS/SRV lookup failed. Check DNS access and the configured Atlas hostname.';
  }
  if (/tls|ssl|certificate|cert_/.test(details)) {
    return 'TLS negotiation failed. Check local TLS inspection/proxy settings and Atlas TLS requirements.';
  }
  if (/replicasetnoprimary|no primary|could not connect to any servers|server selection/.test(details)) {
    return 'Atlas TCP is reachable but no MongoDB primary was selected. Check cluster state, replica-set options, Atlas IP access rules and Database User authentication.';
  }
  if (/timed out|timeout|etimedout|econnrefused|econnreset/.test(details)) {
    return 'Atlas connection timed out or was reset. Check Atlas Network Access, cluster state, VPN/firewall and port 27017.';
  }

  return 'Atlas connection failed. Check the connection options, Database User permissions and cluster status. Credentials were not logged.';
}