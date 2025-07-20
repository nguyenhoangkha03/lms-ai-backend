export class PerformanceUtils {
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    label?: string,
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = process.hrtime.bigint();

    try {
      const result = await fn();
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      if (label) {
        console.log(`${label}: ${executionTime.toFixed(2)}ms`);
      }

      return { result, executionTime };
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      if (label) {
        console.error(`${label} failed after ${executionTime.toFixed(2)}ms:`, error);
      }

      throw error;
    }
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  } {
    return process.memoryUsage();
  }

  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static calculatePercentiles(
    values: number[],
    percentiles: number[] = [50, 95, 99],
  ): Record<string, number> {
    if (values.length === 0) return {};

    const sorted = values.sort((a, b) => a - b);
    const result: Record<string, number> = {};

    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });

    return result;
  }

  static generatePerformanceReport(metrics: {
    responseTimes: number[];
    throughput: number;
    errorRate: number;
    cacheHitRate: number;
  }): string {
    const percentiles = this.calculatePercentiles(metrics.responseTimes);
    const avgResponseTime =
      metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;

    return `
        Performance Report
        ==================
        Average Response Time: ${avgResponseTime.toFixed(2)}ms
        P50 Response Time: ${percentiles.p50?.toFixed(2) || 0}ms
        P95 Response Time: ${percentiles.p95?.toFixed(2) || 0}ms
        P99 Response Time: ${percentiles.p99?.toFixed(2) || 0}ms
        Throughput: ${metrics.throughput.toFixed(2)} requests/sec
        Error Rate: ${metrics.errorRate.toFixed(2)}%
        Cache Hit Rate: ${metrics.cacheHitRate.toFixed(2)}%
        Memory Usage: ${this.formatBytes(this.getMemoryUsage().heapUsed)}
    `.trim();
  }
}
