export class TestReporter {
  static generatePerformanceReport(metrics: any) {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {
        responseTime: {
          average: metrics.average,
          p95: metrics.p95,
          p99: metrics.p99,
          status: metrics.average < 500 ? 'PASS' : 'FAIL',
        },
        throughput: {
          requestsPerSecond: metrics.rps,
          status: metrics.rps > 100 ? 'PASS' : 'FAIL',
        },
        memory: {
          heapUsed: metrics.heapUsed,
          status: !metrics.memoryLeak ? 'PASS' : 'FAIL',
        },
      },
      recommendations: this.generateRecommendations(metrics),
    };

    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));
    return report;
  }

  static generateSecurityReport(vulnerabilities: any[]) {
    const report = {
      timestamp: new Date().toISOString(),
      vulnerabilities: vulnerabilities.length,
      status: vulnerabilities.length === 0 ? 'SECURE' : 'VULNERABILITIES_FOUND',
      details: vulnerabilities,
      recommendations: this.generateSecurityRecommendations(vulnerabilities),
    };

    console.log('🔒 Security Report:', JSON.stringify(report, null, 2));
    return report;
  }

  static generateCoverageReport(coverage: any) {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        statements: coverage.statements.pct,
        branches: coverage.branches.pct,
        functions: coverage.functions.pct,
        lines: coverage.lines.pct,
      },
      status: this.getCoverageStatus(coverage),
      lowCoverageFiles: this.getLowCoverageFiles(coverage),
    };

    console.log('📈 Coverage Report:', JSON.stringify(report, null, 2));
    return report;
  }

  private static generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.average > 500) {
      recommendations.push('Consider implementing more aggressive caching');
      recommendations.push('Optimize database queries');
    }

    if (metrics.rps < 100) {
      recommendations.push('Review application architecture for bottlenecks');
      recommendations.push('Consider horizontal scaling');
    }

    if (metrics.memoryLeak) {
      recommendations.push('Investigate memory leaks in long-running operations');
      recommendations.push('Review event listener cleanup');
    }

    return recommendations;
  }

  private static generateSecurityRecommendations(vulnerabilities: any[]): string[] {
    const recommendations: string[] = [];

    vulnerabilities.forEach(vuln => {
      switch (vuln.type) {
        case 'SQL_INJECTION':
          recommendations.push('Implement parameterized queries');
          break;
        case 'XSS':
          recommendations.push('Enhance input sanitization');
          break;
        case 'AUTH_BYPASS':
          recommendations.push('Review authentication middleware');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  private static getCoverageStatus(coverage: any): string {
    const threshold = 80;
    const overall = Math.min(
      coverage.statements.pct,
      coverage.branches.pct,
      coverage.functions.pct,
      coverage.lines.pct,
    );

    return overall >= threshold ? 'PASS' : 'FAIL';
  }

  private static getLowCoverageFiles(coverage: any): string[] {
    return Object.keys(coverage.files || {})
      .filter(file => coverage.files[file].statements.pct < 80)
      .map(file => ({
        file,
        coverage: coverage.files[file].statements.pct,
      })) as any;
  }
}
