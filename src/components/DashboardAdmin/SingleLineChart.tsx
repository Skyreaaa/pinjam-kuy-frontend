import React from 'react';
import { Line } from 'react-chartjs-2';

interface SingleLineChartProps {
  label: string;
  color: string;
  data: number[];
  labels: string[];
}

const SingleLineChart: React.FC<SingleLineChartProps> = ({ label, color, data, labels }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color + '22', // transparan
        fill: true,
        tension: 0.3,
      },
    ],
  };
  return <Line data={chartData} />;
};

export default SingleLineChart;
