import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface LoadChartProps {
  data: { time: string; load: number; watts: number }[];
}

export function LoadChart({ data }: LoadChartProps) {
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
          <XAxis
            dataKey="time"
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />
          <YAxis
            yAxisId="left"
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}W`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#09090b",
              borderRadius: "4px",
              border: "1px solid #27272a",
              fontSize: "11px"
            }}
            itemStyle={{ fontSize: "11px" }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="load"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Load"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="watts"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Power"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
