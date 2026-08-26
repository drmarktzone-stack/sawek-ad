"use client";

import { LeadsDeptView } from "@/components/dept-leads";
import { DepartmentShell } from "@/components/department-shell";

export default function LeadsPage() {
  return (
    <DepartmentShell titleKey="nav.leads" leadKey="dept.leadsLead">
      {({ pack, packLang }) => <LeadsDeptView pack={pack} packLang={packLang} />}
    </DepartmentShell>
  );
}
