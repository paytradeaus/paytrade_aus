const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  // Inspect Demo wait-queue jobs
  const keys = await r.keys('bull:xero-wait-queue:xero-wait-queue-1008-1d883074*');
  console.log('Demo (1d883074) wait jobs:', keys.length);
  for (const k of keys.slice(0,5)) {
    const data = await r.hgetall(k);
    console.log('---', k);
    console.log('  state:', { attemptsMade: data.attemptsMade, processedOn: data.processedOn, finishedOn: data.finishedOn, failedReason: (data.failedReason||'').slice(0,200) });
    if (data.data) {
      try { const d = JSON.parse(data.data); console.log('  payload:', JSON.stringify(d).slice(0,400)); } catch {}
    }
  }
  // Check delayed/failed sets
  const delayed = await r.zrange('bull:xero-wait-queue:delayed', 0, 5, 'WITHSCORES');
  console.log('\ndelayed (first 5):', delayed);
  const failed = await r.zrange('bull:xero-wait-queue:failed', 0, 5, 'WITHSCORES');
  console.log('failed (first 5):', failed);
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
