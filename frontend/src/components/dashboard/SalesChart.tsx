'use client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export default function SalesChart({ data }: { data: TrendPoint[] }) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: 'Revenue (Rs.)',
        data: data.map((d) => d.revenue),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => 'Rs. ' + Number(ctx.raw).toFixed(2),
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { callback: (v: any) => 'Rs. ' + v },
      },
    },
  };

  return (
    <div className="h-56">
      <Line data={chartData} options={options as any} />
    </div>
  );
}
