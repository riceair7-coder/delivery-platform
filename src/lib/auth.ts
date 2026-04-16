import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function authenticateDriver(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) {
    return null;
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { token },
    });
    return driver;
  } catch {
    return null;
  }
}
