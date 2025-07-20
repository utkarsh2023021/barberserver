// stress.js
const axios = require('axios');
const { performance } = require('perf_hooks');

async function runStressTest() {
  const targetUrl = 'https://numbr-exq6.onrender.com/ping'; // hardcoded

  const totalRequests = 5000;
  const concurrency = 500;
  let completed = 0;
  let failed = 0;
  const durations = [];

  const runRequest = async () => {
    const start = performance.now();
    try {
      await axios.get(targetUrl);
      completed++;
    } catch {
      failed++;
    }
    const end = performance.now();
    return end - start;
  };

  const executeBatch = async () => {
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      if (completed + failed >= totalRequests) break;
      promises.push(runRequest());
    }
    const times = await Promise.all(promises);
    durations.push(...times);
  };

  const startTime = performance.now();
  while (completed + failed < totalRequests) {
    await executeBatch();
  }
  const endTime = performance.now();
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const max = Math.max(...durations);
  const min = Math.min(...durations);
  const totalTime = (endTime - startTime) / 1000;

  return {
    total: totalRequests,
    success: completed,
    failed,
    avg: avg.toFixed(2),
    max: max.toFixed(2),
    min: min.toFixed(2),
    duration: totalTime.toFixed(2)
  };
}

module.exports = runStressTest;
