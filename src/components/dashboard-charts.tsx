"use client";

import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#94a3b8", "#64748b"];

export type MonthlyRevenuePoint = { month: string; amount: number };
export type BookingStatusPoint = { name: string; value: number };

export function RevenueChart({
  data,
  currency,
}: {
  data: MonthlyRevenuePoint[];
  currency: string;
}) {
  const hasRevenue = data.some((point) => point.amount !== 0);

  return (
    <div className="relative h-[250px] w-full">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
          <XAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} dataKey="month" />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(value: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(value)}
          />
          <Tooltip
            formatter={(value) =>
              `${currency} ${new Intl.NumberFormat("en").format(Number(value))}`
            }
          />
          <Line dataKey="amount" dot={false} stroke="#2563eb" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
      {!hasRevenue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-white/75 text-center">
          <span className="text-xs font-medium text-slate-500">No revenue records yet</span>
          <span className="mt-1 text-[11px] text-slate-400">This chart will use verified payments.</span>
        </div>
      )}
    </div>
  );
}

export function BookingStatusChart({ data }: { data: BookingStatusPoint[] }) {
  const count = data.reduce((total, item) => total + item.value, 0);

  if (count === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-center">
        <div className="grid size-14 place-items-center rounded-full bg-slate-50 text-slate-400">
          <span className="text-xl">0</span>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-700">No booking data yet</p>
        <p className="mt-1 max-w-56 text-xs leading-5 text-slate-400">Booking status insights will populate from saved reservations.</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={56} outerRadius={82} paddingAngle={3}>
            {data.map((entry, index) => <Cell fill={STATUS_COLORS[index % STATUS_COLORS.length]} key={entry.name} />)}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
