// Temporary, explicit demonstration. Never enable against a production database.
export const DEMO_COMPANY_ID = '2632123b-45b0-4cae-8c34-7dadbb982c59';
export const DEMO_SENDER = 'andradeenergyltda@gmail.com';
export const DEMO_RECIPIENT = 'viniciusduarteandrade87@gmail.com';
export const DEMO_SUBJECT = '[SIMULACAO HOMOLOGACAO] Fatura ficticia OAuth - UC 99999112121';
export const DEMO_FILENAME = 'fatura-ficticia-oauth-20261121.pdf';
export function gmailDemoEnabled(recipient: string, env = process.env, now = Date.now()): boolean {
  return env.GMAIL_OAUTH_DEMO_ENABLED === 'true'
    && env.SUPABASE_URL === 'https://qqhcjieymypowunkixmk.supabase.co'
    && env.RENDER_EXTERNAL_URL === 'https://andrade-energy-api-homologacao.onrender.com'
    && recipient === DEMO_RECIPIENT
    && now < Date.parse('2026-11-22T12:00:00Z');
}
export function gmailDemoMessageAllowed(recipient: string, sender: string, subject: string, env = process.env, now = Date.now()): boolean {
  return gmailDemoEnabled(recipient, env, now)
    && /^(?:[^<>\r\n]*<)?andradeenergyltda@gmail\.com>?$/i.test(sender.trim())
    && subject === DEMO_SUBJECT;
}
