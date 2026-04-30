const ENTRY_SECRET = process.env.ENTRY_SECRET!;

// Edge-compatible HMAC-SHA256 using Web Crypto API
async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signToken(data: string): Promise<string> {
  return hmacSha256Hex(data, ENTRY_SECRET);
}

export async function verifyToken(data: string, hash: string): Promise<boolean> {
  const sig = await signToken(data);
  return sig === hash;
}
