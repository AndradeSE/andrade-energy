import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gmailDemoEnabled, gmailDemoMessageAllowed, DEMO_RECIPIENT, DEMO_SENDER, DEMO_SUBJECT } from './gmailDemo.policy';
const env = {GMAIL_OAUTH_DEMO_ENABLED:'true', SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co', RENDER_EXTERNAL_URL:'https://andrade-energy-api-homologacao.onrender.com'};
const now = Date.parse('2026-11-21T12:00:00Z');
test('demo requires preview database, host, explicit flag, recipient and nonexpired window', () => {
  assert.equal(gmailDemoEnabled(DEMO_RECIPIENT,env,now),true);
  for (const change of [{GMAIL_OAUTH_DEMO_ENABLED:'false'}, {SUPABASE_URL:'https://ehnkyrsseisvvtbkwrvu.supabase.co'}, {RENDER_EXTERNAL_URL:'https://andrade-energy-api-vda.onrender.com'}]) assert.equal(gmailDemoEnabled(DEMO_RECIPIENT,{...env,...change},now),false);
  assert.equal(gmailDemoEnabled('other@example.com',env,now),false);
  assert.equal(gmailDemoEnabled(DEMO_RECIPIENT,env,Date.parse('2026-11-22T12:00:00Z')),false);
});
test('demo requires exact authorized sender and subject', () => {
  assert.equal(gmailDemoMessageAllowed(DEMO_RECIPIENT,DEMO_SENDER,DEMO_SUBJECT,env,now),true);
  assert.equal(gmailDemoMessageAllowed(DEMO_RECIPIENT,'Andrade Energy <'+DEMO_SENDER+'>',DEMO_SUBJECT,env,now),true);
  assert.equal(gmailDemoMessageAllowed(DEMO_RECIPIENT,'Nome da conta <'+DEMO_SENDER+'>',DEMO_SUBJECT,env,now),true);
  for (const sender of ['attacker@example.com','x'+DEMO_SENDER,DEMO_SENDER+'.evil',DEMO_SENDER+'\r\nBcc: other@example.com']) assert.equal(gmailDemoMessageAllowed(DEMO_RECIPIENT,sender,DEMO_SUBJECT,env,now),false);
  assert.equal(gmailDemoMessageAllowed(DEMO_RECIPIENT,DEMO_SENDER,'ordinary bill',env,now),false);
});
