const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  // Check queue meta and recent activity
  const meta = await r.hgetall('bull:xero-wait-queue:meta');
  console.log('queue meta:', meta);
  const events = await r.xlen('bull:xero-wait-queue:events').catch(()=>'none');
  console.log('events stream length:', events);
  // Look at last few events to see who's processing
  const recent = await r.xrevrange('bull:xero-wait-queue:events', '+', '-', 'COUNT', 10).catch(()=>[]);
  console.log('\nLast 10 events:');
  for (const [id, fields] of recent) {
    console.log(`  ${id}:`, JSON.stringify(fields).slice(0,200));
  }
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
