interface PerformanceMark {
  name: string;
  timestamp: number;
  duration?: number;
}

class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measurements: PerformanceMark[] = [];
  private maxMeasurements = 100;

  mark(name: string) {
    const timestamp = Date.now();
    this.marks.set(name, timestamp);
    console.log(`[PerformanceMonitor] Mark: ${name} at ${timestamp}`);
  }

  measure(name: string, startMark: string, endMark?: string) {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : Date.now();

    if (!startTime) {
      console.warn(`[PerformanceMonitor] Start mark not found: ${startMark}`);
      return;
    }

    const duration = endTime - startTime;
    const measurement: PerformanceMark = {
      name,
      timestamp: startTime,
      duration,
    };

    this.measurements.push(measurement);

    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    console.log(`[PerformanceMonitor] ${name}: ${duration}ms`);

    if (duration > 5000) {
      console.warn(`[PerformanceMonitor] SLOW OPERATION: ${name} took ${duration}ms`);
    }

    return duration;
  }

  getMeasurements(filterPattern?: string): PerformanceMark[] {
    if (!filterPattern) {
      return this.measurements;
    }

    return this.measurements.filter(m => m.name.includes(filterPattern));
  }

  getSlowestMeasurements(limit: number = 10): PerformanceMark[] {
    return [...this.measurements]
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  clear() {
    this.marks.clear();
    this.measurements = [];
    console.log('[PerformanceMonitor] Cleared all measurements');
  }

  getStats() {
    const durations = this.measurements
      .map(m => m.duration)
      .filter((d): d is number => d !== undefined);

    if (durations.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }

    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
    };
  }

  logReport() {
    console.group('[PerformanceMonitor] Performance Report');
    console.log('Total measurements:', this.measurements.length);
    console.log('Stats:', this.getStats());
    console.log('Slowest operations:', this.getSlowestMeasurements(5));
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

if (typeof window !== 'undefined') {
  (window as any).__PERFORMANCE_MONITOR__ = performanceMonitor;
  (window as any).__PERF_REPORT__ = () => performanceMonitor.logReport();

  console.log('[PerformanceMonitor] Available via window.__PERFORMANCE_MONITOR__ and window.__PERF_REPORT__()');
}
