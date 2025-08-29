import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, TrendingUp, TrendingDown, PlusCircle, ArrowUp, ArrowDown } from "lucide-react"

interface OrderMetric {
  title: string
  value: string
  change: string
  isPositive: boolean
  period: string
}

const orderMetrics: OrderMetric[] = [
  {
    title: "Total Revenue",
    value: "1,240",
    change: "14.4%",
    isPositive: true,
    period: "Last 7 days",
  },
  {
    title: "Completed Transactions",
    value: "240",
    change: "20%",
    isPositive: true,
    period: "Last 7 days",
  },
  {
    title: "Failed Transactions",
    value: "960",
    change: "85%",
    isPositive: true,
    period: "Last 7 days",
  },
  {
    title: "Pending Transactions",
    value: "87",
    change: "5%",
    isPositive: false,
    period: "Last 7 days",
  },
]

export default function TransactionsMetrics() {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {orderMetrics.map((metric, index) => (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">{metric.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                  <DropdownMenuItem>Refresh</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">Rwf  {metric.value}</div>
                <div className="flex items-center gap-2 text-sm">

                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between gap-1">
                <span>{metric.period}</span>
                <div className={`flex items-center gap-1 ${metric.isPositive ? "text-blue-600" : "text-red-600"}`}>
                  {metric.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {metric.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
