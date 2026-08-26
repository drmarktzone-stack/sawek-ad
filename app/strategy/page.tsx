"use client";

import { StrategyDeptView } from "@/components/dept-strategy";
import { DepartmentShell } from "@/components/department-shell";

export default function StrategyPage() {
  return (
    <DepartmentShell titleKey="nav.strategy" leadKey="dept.strategyLead">
      {({ pack, packLang }) => <StrategyDeptView pack={pack} packLang={packLang} />}
    </DepartmentShell>
  );
}
