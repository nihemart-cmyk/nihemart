"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

const data = [
  { day: "Sun", value: 22000 },
  { day: "Mon", value: 38000 },
  { day: "Tue", value: 35000 },
  { day: "Wed", value: 42000 },
  { day: "Thu", value: 25409 },
  { day: "Fri", value: 48000 },
  { day: "Sat", value: 45000 },
]

const metrics = [
  {
    title: "Active Customers",
    value: "25k",
  },
  {
    title: "Repeat Customers",
    value: "5.6k",
  },
  {
    title: "Shop Visitor",
    value: "250k",
  },
  {
    title: "Conversion Rate",
    value: "5.5%",
  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

const CustomerTrendGraph = () => {
  const [selectedMetric, setSelectedMetric] = useState(metrics[0].title)

  return (
    <div className="space-y-3 bg-white p-5 rounded-xl border shadow">
      <div className="flex items-center justify-between mb-0 lg:mb-5">
        <h1 className="text-lg md:text-2xl lg:text-3xl font-semibold text-[#23272E]">Customer Overview</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className={cn("space-y-0 pb-2 relative cursor-pointer after:absolute after:bottom-0 after:inset-x-0 after:h-[2px] after:w-full after:content-[''] after:bg-[#E9E7FD] after:transition-all after:rounded-full after:duration-300", {"after:h-1 after:bg-orange-500": selectedMetric === metric.title})}
            onClick={() => setSelectedMetric(metric.title)}
          >

            <div className="text-lg md:text-xl lg:text-2xl font-bold text-[#23272E]">{metric.value}</div>
            <div className="text-xs md:text-base text-[#8B909A]">{metric.title}</div>
          </div>
        ))}
      </div>

      <Card className="shadow-none border-none lg:p-0">
        <CardContent className="px-0">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, left: -20 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4EA674" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4EA674" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(value) => `${value / 1000}k`}
                  domain={[0, 50000]}
                  ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                  tickMargin={10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8B909A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerTrendGraph