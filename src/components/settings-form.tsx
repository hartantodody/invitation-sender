import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { InvitationSettings } from "@/lib/types"

type SettingsFormProps = {
  settings: InvitationSettings
  onChange: (settings: InvitationSettings) => void
  onSave: () => void
  previewGuestName: string
  previewMessage: string
  isSaving?: boolean
}

export function SettingsForm({
  settings,
  onChange,
  onSave,
  previewGuestName,
  previewMessage,
  isSaving = false,
}: SettingsFormProps) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-4 lg:space-y-0">
      <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
        <CardHeader className="px-4 py-4">
          <CardTitle>Pengaturan Undangan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="base-url">URL dasar undangan</Label>
            <Input
              id="base-url"
              value={settings.baseUrl}
              onChange={(event) =>
                onChange({
                  ...settings,
                  baseUrl: event.target.value,
                })
              }
              className="h-11 rounded-xl bg-white"
              placeholder="https://acara-keluarga.example.com/invitation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-text">Teks pembuka</Label>
            <Textarea
              id="opening-text"
              value={settings.openingText}
              onChange={(event) =>
                onChange({
                  ...settings,
                  openingText: event.target.value,
                })
              }
              className="min-h-28 rounded-xl bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="closing-text">Teks penutup</Label>
            <Textarea
              id="closing-text"
              value={settings.closingText}
              onChange={(event) =>
                onChange({
                  ...settings,
                  closingText: event.target.value,
                })
              }
              className="min-h-24 rounded-xl bg-white"
            />
          </div>

          <Button
            className="h-11 w-full rounded-xl bg-[#2f6f44] hover:bg-[#2a663e]"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-[#f7faf7] py-0 shadow-none lg:sticky lg:top-6">
        <CardHeader className="px-4 py-4">
          <CardTitle className="text-base">Pratinjau Pesan</CardTitle>
          <p className="text-sm text-muted-foreground">Contoh untuk {previewGuestName}</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <pre className="rounded-xl border border-border/70 bg-white p-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {previewMessage}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
