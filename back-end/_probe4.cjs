const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  // wait queue meta and any processing status
  console.log('=== wait queue queue stats ===');
  const wait = await r.llen('bull:xero-wait-queue:wait');
  const active = await r.llen('bull:xero-wait-queue:active');
  const delayed = await r.zcard('bull:xero-wait-queue:delayed');
  const failed = await r.zcard('bull:xero-wait-queue:failed');
  const completed = await r.zcard('bull:xero-wait-queue:completed');
  console.log({wait,active,delayed,failed,completed});
  
  // Check stalled
  console.log('\n=== stalled-check ===');
  const stalled = await r.smembers('bull:xero-wait-queue:stalled');
  console.log('stalled members:', stalled);
  
  // Look at one failed job's full details
  console.log('\n=== sample failed job ===');
  const failedJobs = await r.zrange('bull:xero-wait-queue:failed', 0, 0);
  if (failedJobs.length) {
    const data = await r.hgetall(`bull:xero-wait-queue:${failedJobs[0]}`);
    console.log('failed job:', failedJobs[0]);
    console.log('  attemptsMade:', data.attemptsMade, 'finishedOn:', data.finishedOn);
    console.log('  failedReason:', (data.failedReason||'').slice(0,500));
    console.log('  stacktrace:', (data.stacktrace||'').slice(0,800));
  }
  
  // Check what's in active set vs the "processedOn but never finished" jobs
  console.log('\n=== ALL Demo job key states (jobId vs job hash) ===');
  const demoKeys = await r.keys('bull:xero-wait-queue:xero-wait-queue-1008-1d883074*');
  for (const k of demoKeys) {
    const data = await r.hgetall(k);
    const id = k.split(':').slice(-1)[0];
    // is it in delayed?
    const delayedScore = await r.zscore('bull:xero-wait-queue:delayed', id);
    const failedScore = await r.zscore('bull:xero-wait-queue:failed', id);
    const isWait = await r.lpos('bull:xero-wait-queue:wait', id);
    const isActive = await r.lpos('bull:xero-wait-queue:active', id);
    console.log(`  ${id.slice(-8)}: delayed=${delayedScore} failed=${failedScore} wait=${isWait} active=${isActive} processedOn=${data.processedOn} finishedOn=${data.finishedOn} attemptsMade=${data.attemptsMade}`);
    if (data.failedReason) console.log('    failedReason:', data.failedReason.slice(0,300));
    if (data.returnvalue) console.log('    returnvalue:', data.returnvalue.slice(0,200));
  }
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
