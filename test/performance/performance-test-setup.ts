import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import * as autocannon from 'autocannon';

export class PerformanceTestSetup {
  static app: INestApplication;

  static async setupPerformanceApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleRef.createNestApplication();
    await this.app.init();

    return this.app;
  }

  static async runLoadTest(options: {
    url: string;
    connections: number;
    duration: string;
    headers?: Record<string, string>;
    body?: any;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  }) {
    const instance = autocannon({
      url: options.url,
      connections: options.connections,
      duration: options.duration,
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      method: options.method || 'GET',
    });

    return new Promise((resolve, reject) => {
      instance.on('done', resolve);
      instance.on('error', reject);
    });
  }

  static async measureResponseTime(
    testFunction: () => Promise<any>,
    iterations: number = 100,
  ): Promise<{
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await testFunction();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000);
    }

    times.sort((a, b) => a - b);

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: times[0],
      max: times[times.length - 1],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
    };
  }

  static async profileMemoryUsage(
    testFunction: () => Promise<any>,
    duration: number = 60000,
  ): Promise<{
    initialMemory: NodeJS.MemoryUsage;
    finalMemory: NodeJS.MemoryUsage;
    peakMemory: NodeJS.MemoryUsage;
    memoryLeakDetected: boolean;
  }> {
    const initialMemory = process.memoryUsage();
    let peakMemory = initialMemory;
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      await testFunction();
      const currentMemory = process.memoryUsage();

      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = currentMemory;
      }

      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage();

    const memoryLeakDetected = finalMemory.heapUsed > initialMemory.heapUsed * 1.5;

    return {
      initialMemory,
      finalMemory,
      peakMemory,
      memoryLeakDetected,
    };
  }
}
