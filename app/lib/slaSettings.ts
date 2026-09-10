import { prisma } from "@/app/lib/db";
import { DEFAULT_SLA_HOURS, type SlaHours } from "@/app/lib/sla";

export async function getSlaHours(): Promise<SlaHours> {
  const row = await prisma.sla_settings.findUnique({ where: { id: 1 } });
  if (!row) return { ...DEFAULT_SLA_HOURS };
  return { Low: row.low_hours, Normal: row.normal_hours, High: row.high_hours, enabled: row.enabled };
}

export async function setSlaHours(hours: SlaHours, updatedBy: string): Promise<void> {
  const data = {
    enabled: hours.enabled,
    low_hours: hours.Low,
    normal_hours: hours.Normal,
    high_hours: hours.High,
    updated_by: updatedBy,
  };
  await prisma.sla_settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}
