const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  const items = await r.lrange('xero_webhook_queue:staging', 0, -1);
  const byTenant = new Map();
  const byCat = new Map();
  let oldest = null, newest = null;
  for (const s of items) {
    try {
      const e = JSON.parse(s);
      byTenant.set(e.tenantId, (byTenant.get(e.tenantId)||0)+1);
      const k = `${e.eventCategory}.${e.eventType}`;
      byCat.set(k, (byCat.get(k)||0)+1);
      if (!oldest || e.eventDateUtc < oldest) oldest = e.eventDateUtc;
      if (!newest || e.eventDateUtc > newest) newest = e.eventDateUtc;
    } catch {}
  }
  console.log(`Total: ${items.length}, oldest=${oldest}, newest=${newest}`);
  console.log('\nBy tenant:');
  for (const [t,c] of [...byTenant.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${t}: ${c}`);
  console.log('\nBy category.type:');
  for (const [t,c] of [...byCat.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${t}: ${c}`);
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
