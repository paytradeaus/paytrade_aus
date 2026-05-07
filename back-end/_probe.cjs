const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  const keys = ['xero_webhook_queue','xero_webhook_queue:production','xero_webhook_queue:staging','xero_webhook_queue:development'];
  for (const k of keys) {
    const t = await r.type(k);
    const len = t === 'list' ? await r.llen(k) : 0;
    console.log(`${k}: type=${t}, llen=${len}`);
    if (len > 0) {
      const tail = await r.lrange(k, -5, -1);
      tail.forEach((s,i)=>{
        try { const e = JSON.parse(s); console.log(`  [${i}] cat=${e.eventCategory} type=${e.eventType} tenant=${e.tenantId} res=${e.resourceId} t=${e.eventDateUtc}`); }
        catch { console.log(`  [${i}] raw=${s.substring(0,180)}`); }
      });
    }
  }
  const all = await r.keys('*xero*');
  console.log('\nAll xero* keys:', all);
  await r.quit();
})().catch(e => { console.error(e); process.exit(1); });
