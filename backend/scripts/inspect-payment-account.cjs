// Read-only operational check. Run only on the private hosting provider console.
// Never print the credential, raw provider response, phone, document, or address.
async function main() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) { console.log('PAYMENT_ACCOUNT_CHECK: credential absent'); return; }
  const response = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${token}` }, redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) { console.log(`PAYMENT_ACCOUNT_CHECK: HTTP ${response.status}`); return; }
  const data = await response.json();
  const email = typeof data.email === 'string' ? data.email : '';
  const [local, domain] = email.split('@');
  console.log('PAYMENT_ACCOUNT_CHECK', JSON.stringify({
    accountId: typeof data.id === 'number' ? data.id : null,
    nickname: typeof data.nickname === 'string' ? data.nickname : null,
    emailHint: domain ? `${local.slice(0, 3)}***@${domain}` : null,
  }));
}
main().catch(() => console.log('PAYMENT_ACCOUNT_CHECK: consultation unavailable'));
