import { createClient } from "redis";

const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

const subClient = pubClient.duplicate();

pubClient.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
});

subClient.on("error", (err) => {
  console.error("Redis Subscriber Error:", err);
});

export const connectRedis = async () => {
  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
  ]);

  console.log("✅ Redis connected");
};

export { pubClient, subClient };