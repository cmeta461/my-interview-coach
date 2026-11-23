# System Design Framework

## Step by step
1. Clarify requirements: functional features, non-functional needs such as latency, availability and consistency, and the scale in users and requests per second.
2. Estimate scale: daily active users, reads versus writes, storage per day, bandwidth.
3. High level design: clients, load balancer, stateless application servers, database, cache, queue.
4. Data model and APIs: main entities, key endpoints, choice of SQL versus NoSQL and why.
5. Deep dive: pick one or two components such as the feed, the cache, or the sharding strategy.
6. Bottlenecks and tradeoffs: single points of failure, hot keys, consistency versus availability.

## Caching
Use a cache for read heavy data. Policies include least recently used, least frequently used and time to live. Strategies are cache aside, write through and write back. Watch for cache stampedes and stale data, and plan invalidation.

## Scaling the database
Start with indexes and read replicas. Then partition the data with sharding by a key such as user id. Consistent hashing reduces data movement when adding shards. Beware of hot shards and cross shard joins.

## Classic prompts
Design a URL shortener. Design a news feed. Design a chat application. Design a rate limiter. Design a ride sharing service.
