'use client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CategoryData {
  category: string;
  revenue: number;
  quantity: number;
}

export default function SalesReportChart({ data }: { data: CategoryData[] }) {
  if (!data.length) {
    return <p className="text-gray-400 text-sm text-center py-8">No data available</p>;
  }

  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: 'Revenue ($)',
        data: data.map((d) => d.revenue),
        backgroundColor: [
          'rgba(37, 99, 235, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderRadius: 6,
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
          label: (ctx: any) => '$' + Number(ctx.raw).toFixed(2),
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: { callback: (v: any) => '$' + v },
      },
    },
  };

  return (
    <div className="h-56">
      <Bar data={chartData} options={options as any} />
    </div>
  );
}
