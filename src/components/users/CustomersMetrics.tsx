import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ArrowDown, ArrowUp, MoreHorizontal, TrendingDown, TrendingUp } from "lucide-react"
import { FC } from 'react'
import { Card, CardHeader } from '../ui/card'
import CustomerTrendGraph from "./CustomerTrendGraph"

interface CustomersMetricsProps {

}

interface CustomersMetric {
    title: string
    value: string
    change: string
    isPositive: boolean
    period: string
}

const customersMetrics: CustomersMetric[] = [
    {
        title: "Total Orders",
        value: "1,240",
        change: "14.4%",
        isPositive: true,
        period: "Last 7 days",
    },
    {
        title: "New Orders",
        value: "240",
        change: "20%",
        isPositive: true,
        period: "Last 7 days",
    },
    {
        title: "Completed Orders",
        value: "960",
        change: "85%",
        isPositive: true,
        period: "Last 7 days",
    },
]

const CustomersMetrics: FC<CustomersMetricsProps> = ({ }) => {
    return <div className='w-full mb-3'>
        <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-[0.25] grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-3">
                {customersMetrics.map((metric, index) => (
                    <Card key={index} className="relative">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
                            <h3 className="text-base sm:text-lg text-[#23272E] font-semibold">{metric.title}</h3>
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
                                <div className="text-xl sm:text-3xl font-bold text-[#023337]">{metric.value}</div>
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={`flex items-center gap-1 ${metric.isPositive ? "text-green-600" : "text-red-600"}`}>
                                        {metric.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                        <span>
                                            {metric.change}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">{metric.period}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="flex-[0.75]">
                <CustomerTrendGraph />
            </div>
        </div>

    </div>
}

export default CustomersMetrics