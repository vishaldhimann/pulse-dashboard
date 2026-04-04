declare module 'highcharts/highcharts.src.js' {
  const Highcharts: {
    chart(renderTo: HTMLElement, options: Record<string, unknown>): { destroy(): void };
  };
  export default Highcharts;
}
