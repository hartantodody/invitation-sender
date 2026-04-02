import { Card, CardContent } from "@/components/ui/card"

type StatsSummaryProps = {
  total: number
  sent: number
  pending: number
}

type SummaryItem = {
  label: string
  value: number
  valueClassName?: string
}

const summaryItems = (values: StatsSummaryProps): SummaryItem[] => [
  { label: "Total", value: values.total },
  { label: "Terkirim", value: values.sent, valueClassName: "text-[#1f5a31]" },
  { label: "Menunggu", value: values.pending, valueClassName: "text-[#825f10]" },
]

export function StatsSummary({ total, sent, pending }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {summaryItems({ total, sent, pending }).map((item) => (
        <Card key={item.label} className="border border-border/80 bg-[#f4f8f4] py-0 shadow-none">
          <CardContent className="space-y-1 px-3 py-3 text-center">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-lg font-semibold ${item.valueClassName ?? "text-foreground"}`}>{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
