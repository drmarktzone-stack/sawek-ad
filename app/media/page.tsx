"use client";

import { MediaDeptView } from "@/components/dept-media";
import { DepartmentShell } from "@/components/department-shell";

export default function MediaPage() {
  return (
    <DepartmentShell titleKey="nav.media" leadKey="dept.mediaLead">
      {({ pack, packLang }) => <MediaDeptView pack={pack} packLang={packLang} />}
    </DepartmentShell>
  );
}
