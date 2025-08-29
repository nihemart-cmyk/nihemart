'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, Bar, BarChart } from 'recharts'

const areaChartData = [
  { name: 'Jan', orders: 50 },
  { name: 'Feb', orders: 45 },
  { name: 'Mar', orders: 40 },
  { name: 'Apr', orders: 35 },
  { name: 'May', orders: 55 },
  { name: 'Jun', orders: 120 },
]

const barChartData = [
  { name: 'Jan', value: 280 },
  { name: 'Feb', value: 320 },
  { name: 'Mar', value: 350 },
  { name: 'Apr', value: 380 },
  { name: 'May', value: 420 },
  { name: 'Jun', value: 450 },
]

const areaChartConfig = {
  orders: {
    label: "New Orders",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const barChartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function StockOverview() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Content */}
      <div className="flex-1 space-y-6">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Products */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">320</div>
              <p className="text-xs text-red-500 mt-1">+5%</p>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Low Stock</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-red-500 mt-1">-10%</p>
            </CardContent>
          </Card>

          {/* New Orders */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">New Orders</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">120</div>
              <p className="text-xs text-red-500 mt-1">+8%</p>
            </CardContent>
          </Card>

          {/* Pending Shipments */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Ship...</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-red-500 mt-1">-2%</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Orders Chart */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-gray-600">New Orders</CardTitle>
                <div className="text-2xl font-bold mt-2">120 <span className="text-xs text-red-500">+8%</span></div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <ChartContainer config={areaChartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={areaChartData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                  height={120}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Area
                    dataKey="orders"
                    type="monotone"
                    fill="#f97316"
                    fillOpacity={0.2}
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Card Title Chart */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium text-gray-600">Card Title</CardTitle>
                <div className="text-2xl font-bold mt-2">7.7k <span className="text-xs text-red-500">+2.5% last mo</span></div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View details</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barChartConfig}>
                <BarChart 
                  accessibilityLayer 
                  data={barChartData}
                  height={120}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#f97316" 
                    radius={[2, 2, 0, 0]} 
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Sidebar Actions */}
      <div className="w-full lg:w-[30%] space-y-4">
        <Card className="bg-white p-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Reason</div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                Adding
              </Button>
              <Button size="sm" variant="outline" className="border-orange-500 text-orange-500">
                Decrease
              </Button>
            </div>
            <div className="text-xs text-gray-500">Blowout</div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Save
            </Button>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </Card>

        <Card className="bg-white p-4">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">Update Stock</div>
            <div className="text-xs text-gray-500">Blowout</div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Update
            </Button>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}