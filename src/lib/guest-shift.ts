import type { GuestShift } from "@/lib/types"

export const guestShiftOptions: { value: GuestShift; label: string }[] = [
  { value: "1", label: "Shift 1 (10.00 - 12.00)" },
  { value: "2", label: "Shift 2 (13.00 - 15.00)" },
  { value: "3", label: "Shift 3 (15.00 - 17.00)" },
]

export function getGuestShiftLabel(shift: GuestShift) {
  return guestShiftOptions.find((option) => option.value === shift)?.label ?? `Shift ${shift}`
}
