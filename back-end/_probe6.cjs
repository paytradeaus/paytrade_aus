const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  // Check failed jobs to see if they're from dev competing for prod jobs
  const failedIds = await r.zrange('bull:xero-wait-queue:failed', 0, -1);
  console.log('All failed wait jobs:', failedIds.length);
  let noIntegrationCount = 0;
  let otherCount = 0;
  const samples = [];
  for (const id of failedIds) {
    const data = await r.hgetall(`bull:xero-wait-queue:${id}`);
    const reason = data.failedReason || '';
    if (reason.includes('No integration found') || reason.includes('No PRIMARY ADMIN')) {
      noIntegrationCount++;
      if (samples.length < 5) samples.push({id: id.slice(-12), reason: reason.slice(0,150)});
    } else {
      otherCount++;
      if (otherCount <= 3) console.log('OTHER:', id.slice(-12), reason.slice(0,200));
    }
  }
  console.log(`\nFailed with "No integration/admin found": ${noIntegrationCount}`);
  console.log(`Failed for other reasons: ${otherCount}`);
  console.log('\nSamples of "no integration" failures:');
  for (const s of samples) console.log(' ', s);
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
