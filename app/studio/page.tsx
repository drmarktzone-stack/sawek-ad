"use client";

import { CreativeDeptView } from "@/components/dept-creative";
import { DepartmentShell } from "@/components/department-shell";
import { ContentStudio } from "@/components/content-studio";

export default function StudioPage() {
  return (
    <DepartmentShell titleKey="nav.creative" leadKey="dept.creativeLead">
      {({ pack, packLang, onPack }) => (
        <>
          <CreativeDeptView pack={pack} packLang={packLang} onPack={onPack} />
          <ContentStudio embedded />
        </>
      )}
    </DepartmentShell>
  );
}
