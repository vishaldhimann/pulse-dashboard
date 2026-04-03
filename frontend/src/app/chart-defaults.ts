import { Chart, type ChartOptions, type Plugin, type TooltipItem } from 'chart.js/auto';

/** Warm-neutral grid on wheat cards. */
const grid = 'rgba(68, 64, 60, 0.08)';
const tick = '#57534e';

/** Plot panel — inset on cream cards. */
const plotBackgroundPlugin: Plugin = {
  id: 'pulsePlotBackground',
  beforeDatasetsDraw: chart => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.fillStyle = '#faf7f2';
    const { left, top, width, height } = chartArea;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(left + r, top);
    ctx.lineTo(left + width - r, top);
    ctx.quadraticCurveTo(left + width, top, left + width, top + r);
    ctx.lineTo(left + width, top + height - r);
    ctx.quadraticCurveTo(left + width, top + height, left + width - r, top + height);
    ctx.lineTo(left + r, top + height);
    ctx.quadraticCurveTo(left, top + height, left, top + height - r);
    ctx.lineTo(left, top + r);
    ctx.quadraticCurveTo(left, top, left + r, top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 113, 108, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
};

let plotPluginRegistered = false;

export function applyPulseChartTheme(): void {
  if (!plotPluginRegistered) {
    Chart.register(plotBackgroundPlugin);
    plotPluginRegistered = true;
  }
  Chart.defaults.font.family = "Arial, Helvetica, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = tick;
  Chart.defaults.plugins.legend.labels.color = '#44403c';
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.tooltip.backgroundColor = '#ffffff';
  Chart.defaults.plugins.tooltip.titleColor = '#202124';
  Chart.defaults.plugins.tooltip.bodyColor = '#5f6368';
  Chart.defaults.plugins.tooltip.borderColor = '#d6d3d1';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.titleSpacing = 6;
  Chart.defaults.plugins.tooltip.bodySpacing = 6;
  Chart.defaults.plugins.tooltip.boxPadding = 6;
}

/** Rich tones tuned for wheat / cream surfaces. */
export const palette = {
  primary: '#0f766e',
  secondary: '#b45309',
  teal: '#047857',
  amber: '#d97706',
  rose: '#be123c',
  series: [
    '#0f766e',
    '#b45309',
    '#047857',
    '#ca8a04',
    '#be123c',
    '#7c2d12',
    '#0369a1',
    '#6d28d9'
  ]
};

const cartesianScales = {
  x: {
    grid: { display: false, color: grid },
    ticks: { color: tick, maxRotation: 40, minRotation: 0, font: { size: 12, weight: 500 } },
    border: { display: false }
  },
  y: {
    beginAtZero: true,
    grid: { color: grid, lineWidth: 1, drawTicks: false },
    ticks: { color: tick, precision: 0, font: { size: 12, weight: 500 } },
    border: { display: false }
  }
};

export const barDatasetStyle = {
  borderWidth: 2,
  borderColor: '#ffffff',
  borderRadius: 8,
  borderSkipped: false as const
};

export function verticalBarOptions(extra?: ChartOptions<'bar'>): ChartOptions<'bar'> {
  const { plugins: xp, ...rest } = extra ?? {};
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 2, bottom: 2, left: 2, right: 6 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { color: '#44403c', boxWidth: 10, padding: 10, font: { size: 12, weight: 500 } },
        ...xp?.legend
      },
      tooltip: { enabled: true, ...xp?.tooltip }
    },
    scales: cartesianScales,
    ...rest
  };
}

export function horizontalBarOptions(extra?: ChartOptions<'bar'>): ChartOptions<'bar'> {
  const { plugins: xp, scales: xs, ...rest } = extra ?? {};
  const base = verticalBarOptions();
  return {
    ...base,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: grid, lineWidth: 1 },
        ticks: { color: tick, precision: 0, font: { size: 12, weight: 500 } },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: tick, font: { size: 12, weight: 500 } },
        border: { display: false }
      },
      ...xs
    },
    plugins: {
      ...base.plugins,
      ...xp,
      tooltip: { enabled: true, ...base.plugins?.tooltip, ...xp?.tooltip }
    },
    ...rest
  };
}

export function lineTrendOptions(extra?: ChartOptions<'line'>): ChartOptions<'line'> {
  const { plugins: xp, ...rest } = extra ?? {};
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 2, bottom: 2, left: 2, right: 6 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false, labels: { color: '#44403c' }, ...xp?.legend },
      tooltip: { enabled: true, ...xp?.tooltip }
    },
    scales: cartesianScales,
    elements: {
      line: { tension: 0.3, borderWidth: 2.25, borderCapStyle: 'round' as const },
      point: {
        radius: 3,
        hoverRadius: 6,
        borderWidth: 2,
        backgroundColor: '#ffffff',
        borderColor: palette.primary
      }
    },
    ...rest
  };
}

function doughnutTooltipCallbacks(labels: string[], total: number) {
  return {
    label: (item: TooltipItem<'doughnut'>) => {
      const v = Number(item.raw);
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
      const label = labels[item.dataIndex] ?? String(item.label);
      return ` ${label}: ${v.toLocaleString()} (${pct}% of total)`;
    }
  };
}

function pieTooltipCallbacks(labels: string[], total: number) {
  return {
    label: (item: TooltipItem<'pie'>) => {
      const v = Number(item.raw);
      const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
      const label = labels[item.dataIndex] ?? String(item.label);
      return ` ${label}: ${v.toLocaleString()} (${pct}% of total)`;
    }
  };
}

export function doughnutOptions(
  labels: string[],
  values: number[],
  extra?: ChartOptions<'doughnut'>
): ChartOptions<'doughnut'> {
  const total = values.reduce((s, n) => s + n, 0);
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '58%',
    layout: { padding: { top: 4, bottom: 2, left: 2, right: 2 } },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: { color: '#44403c', boxWidth: 10, padding: 10, font: { size: 12, weight: 500 } }
      },
      tooltip: { enabled: true, callbacks: doughnutTooltipCallbacks(labels, total) }
    },
    ...extra
  };
}

export function pieOptions(labels: string[], values: number[], extra?: ChartOptions<'pie'>): ChartOptions<'pie'> {
  const total = values.reduce((s, n) => s + n, 0);
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, bottom: 2, left: 2, right: 2 } },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: { color: '#44403c', boxWidth: 10, padding: 10, font: { size: 12, weight: 500 } }
      },
      tooltip: { enabled: true, callbacks: pieTooltipCallbacks(labels, total) }
    },
    ...extra
  };
}

export function funnelBarOptions(counts: number[], extra?: ChartOptions<'bar'>): ChartOptions<'bar'> {
  const first = counts[0] ?? 0;
  return verticalBarOptions({
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (items: TooltipItem<'bar'>[]) => {
            const i = items[0]?.dataIndex ?? 0;
            return `Stage ${i + 1}`;
          },
          afterBody: (items: TooltipItem<'bar'>[]) => {
            const i = items[0]?.dataIndex ?? 0;
            const v = Number(items[0]?.raw);
            const lines: string[] = [];
            if (first > 0) {
              lines.push(`Retention vs start: ${((v / first) * 100).toFixed(1)}%`);
            }
            if (i > 0) {
              const prev = counts[i - 1];
              if (prev && prev > 0) {
                lines.push(`Conversion from previous: ${((v / prev) * 100).toFixed(1)}%`);
                lines.push(`Drop-off from previous: ${((1 - v / prev) * 100).toFixed(1)}%`);
              }
            }
            return lines;
          }
        }
      }
    },
    ...extra
  });
}
