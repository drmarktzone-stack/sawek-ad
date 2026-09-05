"use client";

import type { VoiceProfile } from "@/lib/types";
import { VOICE_DIALECTS } from "@/lib/engine/voice";
import { filled } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function VoiceFields({
  value,
  onChange,
}: {
  value: VoiceProfile;
  onChange: (next: VoiceProfile) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <Label className={filled(value.niche) ? "text-teal" : undefined}>{t("viral.niche")}</Label>
        <Input
          data-testid="viral-niche"
          value={value.niche}
          placeholder={t("viral.nichePh")}
          onChange={(e) => onChange({ ...value, niche: e.target.value })}
          className={filled(value.niche) ? "agency-field-filled" : undefined}
        />
      </div>
      <div>
        <Label className={filled(value.coreMessage) ? "text-teal" : undefined}>{t("viral.core")}</Label>
        <Textarea
          data-testid="viral-core"
          value={value.coreMessage}
          placeholder={t("viral.corePh")}
          onChange={(e) => onChange({ ...value, coreMessage: e.target.value })}
          className={cn("min-h-20", filled(value.coreMessage) ? "agency-field-filled" : undefined)}
        />
      </div>
      <div>
        <Label className={filled(value.personalVoice) ? "text-teal" : undefined}>{t("viral.voice")}</Label>
        <Textarea
          data-testid="viral-voice"
          value={value.personalVoice}
          placeholder={t("viral.voicePh")}
          onChange={(e) => onChange({ ...value, personalVoice: e.target.value })}
          className={cn("min-h-20", filled(value.personalVoice) ? "agency-field-filled" : undefined)}
        />
      </div>
      <div>
        <Label>{t("viral.dialect")}</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {VOICE_DIALECTS.map((d) => (
            <button
              key={d.id}
              type="button"
              data-testid={`viral-dialect-${d.id}`}
              onClick={() => onChange({ ...value, dialect: value.dialect === d.id ? "" : d.id })}
              className={cn(
                "rounded-[12px] border px-3 py-2 text-start text-sm font-bold",
                value.dialect === d.id
                  ? "border-teal bg-teal text-white"
                  : "border-[rgba(8,17,31,0.12)] bg-white text-navy hover:border-teal",
              )}
            >
              <span className="block">{d.label[locale]}</span>
              <span className={cn("mt-0.5 block text-xs font-medium", value.dialect === d.id ? "text-white/80" : "text-muted")}>
                {d.hint[locale]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
