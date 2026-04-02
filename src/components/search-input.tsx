import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari nama tamu...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-white pl-9 text-sm"
      />
    </div>
  )
}
