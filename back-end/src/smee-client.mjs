// smee-client.js
import SmeeClient from 'smee-client';

const smee = new SmeeClient({
  source: 'https://smee.io/rsBNOnlNeINZ2Gun',
  target: 'http://localhost:3004/webhook/xero',
  logger: {
    info: (...args) => console.log('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
  }
})

const events = smee.start()

console.log('Smee client is forwarding to http://localhost:3004/webhook/xero')

// Optional: close after some time
// setTimeout(() => events.close(), 10 * 60 * 1000) // stop after 10 mins
