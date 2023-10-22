# node-async-semaphore: Advanced & Fast Semaphore for TypeScript

Node-Async-Semaphore is not just another counting mechanism. It's a highly optimized, TypeScript-based Semaphore solution that leverages a vector of resources instead of a mere permit count, making integration into projects both convenient and efficient. Whether you're designing pooling systems, rate limiters, or merely trying to regulate access, Semaphore has got you covered.

## Features
- 🚀 **Performance**: Experience optimized performance regardless of scale.
- 🚦 **Rate Limiting**: Includes built-in rate limiting capabilities.
- 💡 **TypeScript Support**: Written in TypeScript and perfectly typed, ensuring robust development.

## Getting Started

### Installation
Using npm:
```bash
npm install node-async-semaphore
```

or

Using yarn:
```bash
yarn add node-async-semaphore
```

## Usage

### Simple Semaphore without resource
```typescript
import { Semaphore, voidResource } from 'node-async-semaphore';

const counterSemaphore = new Semaphore({
  permits: 3,
  resource: voidResource,
});

async function performConcurrentOperation(index: number) {
  await counterSemaphore.acquire();
  console.log(`Operation ${index} is running`);
  setTimeout(() => {
    console.log(`Finishing operation ${index}`);
    counterSemaphore.release();
  }, 1000);
}

for (let i = 1; i <= 5; i++) {
  performConcurrentOperation(i); // Only 3 operations will run concurrently due to the semaphore.
}
```

### Resource-pooling
```typescript
import { Semaphore } from 'node-async-semaphore';
import { createClient } from 'promise-redis';

const redisSemaphore = new Semaphore({
  permits: 3,
  resource: () => createClient(),
});

async function runRedisCommand() {
  const client = await redisSemaphore.acquire();
  console.log('Running Redis command...');
  await client.set('key', 'value');
  const result = await client.get('key');
  console.log(`Retrieved value: ${result}`);
  redisSemaphore.release(client);
}

for (let i = 0; i < 5; i++) {
  runRedisCommand();  // Only 3 Redis commands will be active at once due to the semaphore.
}
```

### Rate-limiter
```typescript
import { SimpleRateLimiter } from 'node-async-semaphore';

const rateLimiter = new SimpleRateLimiter({
  requests: 10,              // Allow 10 tasks every 5 seconds.
  interval: 5000,            // 5 seconds interval.
  uniformDistribution: false // Delay is not spread evenly across requests.
});

async function rateLimitedTask() {
  await rateLimiter.acquire();
  console.log("Task running at", new Date().toISOString());
  // The task logic goes here...
}

for (let i = 0; i < 15; i++) {
  rateLimitedTask();  // Only the first 10 tasks will run immediately. The next 5 will be queued with an even delay.
}
```

## License

This code is licensed under the MIT License.