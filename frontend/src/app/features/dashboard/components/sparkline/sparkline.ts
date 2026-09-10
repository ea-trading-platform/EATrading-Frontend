import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    <svg [style.width.px]="width()" [style.height.px]="height()" [attr.viewBox]="'0 0 ' + width() + ' ' + height()" xmlns="http://www.w3.org/2000/svg">
      <polyline
        [attr.points]="pathPoints()"
        fill="none"
        [attr.stroke]="color()"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: [`
    svg {
      display: block;
    }
  `],
})
export class SparklineChart {
  data = input<number[]>([]);
  width = input(60);
  height = input(24);
  color = computed(() => {
    const values = this.data();
    if (values.length < 2) return '#4ecccc';
    return values[values.length - 1] >= values[0] ? '#22c55e' : '#ef4444';
  });

  pathPoints = computed(() => {
    const values = this.data();
    if (values.length === 0) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = this.width();
    const height = this.height();
    const padding = 2;
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((value - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    }).join(' ');
    
    return points;
  });
}
