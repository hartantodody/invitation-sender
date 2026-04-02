import { PlusIcon, Trash2Icon } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { InvitationLanguage, InvitationMessageTemplate, InvitationSettings } from "@/lib/types"

type TemplatePatch = Partial<
  Pick<InvitationMessageTemplate, "languageCode" | "languageLabel" | "openingText" | "closingText">
>

type SettingsFormProps = {
  settings: InvitationSettings
  onChange: (settings: InvitationSettings) => void
  onTemplateChange: (index: number, patch: TemplatePatch) => void
  onAddLanguage: () => void
  onRemoveLanguage: (index: number) => void
  onSave: () => void
  previewGuestName: string
  previewMessage: string
  previewLanguage: InvitationLanguage
  onPreviewLanguageChange: (language: InvitationLanguage) => void
  isSaving?: boolean
}

export function SettingsForm({
  settings,
  onChange,
  onTemplateChange,
  onAddLanguage,
  onRemoveLanguage,
  onSave,
  previewGuestName,
  previewMessage,
  previewLanguage,
  onPreviewLanguageChange,
  isSaving = false,
}: SettingsFormProps) {
  const previewLanguageOptions = settings.templates.filter((template) => template.languageCode.trim())

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-4 lg:space-y-0">
      <div className="space-y-4">
        <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
          <CardHeader className="px-4 py-4">
            <CardTitle>Pengaturan Umum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-4">
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
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
          <CardHeader className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Template Pesan per Bahasa</CardTitle>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg bg-white"
                onClick={onAddLanguage}
              >
                <PlusIcon className="size-4" />
                Tambah Bahasa
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <Accordion
              type="multiple"
              className="space-y-2"
              defaultValue={settings.templates.map((template, index) => `${template.id}-${index}`)}
            >
              {settings.templates.map((template, index) => (
                <AccordionItem
                  key={`${template.id}-${index}`}
                  value={`${template.id}-${index}`}
                  className="overflow-hidden rounded-xl border border-border/80 bg-[#f7faf7] px-3"
                >
                  <AccordionTrigger className="py-3 text-sm no-underline hover:no-underline">
                    <div className="space-y-0.5 text-left">
                      <p className="font-medium text-foreground">{template.languageLabel || `Bahasa ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{template.languageCode || "kode-bahasa"}</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`language-label-${index}`}>Nama Bahasa</Label>
                        <Input
                          id={`language-label-${index}`}
                          value={template.languageLabel}
                          onChange={(event) =>
                            onTemplateChange(index, {
                              languageLabel: event.target.value,
                            })
                          }
                          className="h-10 rounded-lg bg-white"
                          placeholder="Indonesia"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`language-code-${index}`}>Kode Bahasa</Label>
                        <Input
                          id={`language-code-${index}`}
                          value={template.languageCode}
                          onChange={(event) =>
                            onTemplateChange(index, {
                              languageCode: event.target.value,
                            })
                          }
                          className="h-10 rounded-lg bg-white lowercase"
                          placeholder="id"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`opening-text-${index}`}>Teks pembuka</Label>
                      <Textarea
                        id={`opening-text-${index}`}
                        value={template.openingText}
                        onChange={(event) =>
                          onTemplateChange(index, {
                            openingText: event.target.value,
                          })
                        }
                        className="min-h-24 rounded-xl bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`closing-text-${index}`}>Teks penutup</Label>
                      <Textarea
                        id={`closing-text-${index}`}
                        value={template.closingText}
                        onChange={(event) =>
                          onTemplateChange(index, {
                            closingText: event.target.value,
                          })
                        }
                        className="min-h-20 rounded-xl bg-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg bg-white text-destructive hover:text-destructive"
                        onClick={() => onRemoveLanguage(index)}
                        disabled={settings.templates.length <= 1}
                      >
                        <Trash2Icon className="size-4" />
                        Hapus Bahasa
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Button
              className="h-11 w-full rounded-xl bg-[#2f6f44] hover:bg-[#2a663e]"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-[#f7faf7] py-0 shadow-none lg:sticky lg:top-6">
        <CardHeader className="px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Pratinjau Pesan</CardTitle>
            <Select
              value={previewLanguage}
              onValueChange={(value) => onPreviewLanguageChange(value as InvitationLanguage)}
            >
              <SelectTrigger className="h-9 min-w-30 rounded-lg bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {previewLanguageOptions.map((template) => (
                  <SelectItem key={template.id} value={template.languageCode}>
                    {template.languageLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
