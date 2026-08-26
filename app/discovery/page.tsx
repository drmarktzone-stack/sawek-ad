"use client";

import { DiscoveryDeptView } from "@/components/dept-discovery";
import { DepartmentShell } from "@/components/department-shell";

export default function DiscoveryPage() {
  return (
    <DepartmentShell titleKey="nav.discovery" leadKey="dept.discoveryLead">
      {({ pack, packLang }) => <DiscoveryDeptView pack={pack} packLang={packLang} />}
    </DepartmentShell>
  );
}
