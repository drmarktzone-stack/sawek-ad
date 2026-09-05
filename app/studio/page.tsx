"use client";

import { CreativeDeptView } from "@/components/dept-creative";
import { DepartmentShell } from "@/components/department-shell";
import { ContentStudio } from "@/components/content-studio";
import { VariationsPanel } from "@/components/variations-panel";
import { ViralDesk } from "@/components/viral-desk";

export default function StudioPage() {
  return (
    <DepartmentShell titleKey="nav.studio" leadKey="dept.creativeLead">
      {({ pack, packLang, onPack }) => (
        <>
          <VariationsPanel pack={pack} locale={packLang} onPack={onPack} />
          <ViralDesk key={`${pack.id}-${packLang}`} pack={pack} packLang={packLang} onPack={onPack} embedded />
          <CreativeDeptView pack={pack} packLang={packLang} onPack={onPack} />
          <ContentStudio embedded />
        </>
      )}
    </DepartmentShell>
  );
}
