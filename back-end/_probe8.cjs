const Redis = require('ioredis');
(async () => {
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
  // Look for new env-namespaced BullMQ keys (Replit dev should be writing to bull:development:*)
  const devKeys = await r.keys('bull:development:*');
  const stagingKeys = await r.keys('bull:staging:*');
  const legacyKeys = await r.keys('bull:xero-wait-queue:*');
  const legacyRefreshKeys = await r.keys('bull:xero-refresh-token:*');
  console.log('bull:development:* count:', devKeys.length);
  console.log('  sample:', devKeys.slice(0,8));
  console.log('bull:staging:* count:', stagingKeys.length);
  console.log('bull:xero-wait-queue:* (legacy/prod) count:', legacyKeys.length);
  console.log('bull:xero-refresh-token:* (legacy/prod) count:', legacyRefreshKeys.length);
  await r.quit();
})().catch(e=>{console.error(e);process.exit(1);});
