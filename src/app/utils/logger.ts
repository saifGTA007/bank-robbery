import { prisma } from '@/lib/prisma';

export async function logEvent(action: string, details: string, userName?: string) {
  try {
    await prisma.activityLog.create({
      data: { action, details, userName },
    });
  } catch (error) {
    console.error("Logging failed:", error);
  }
}