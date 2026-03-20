import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { proofType, proofData, failureReason } = await request.json();
    return NextResponse.json({ success: true, data: { deliveryId: id, status: failureReason ? 'failed' : 'completed', proofType, completedAt: new Date().toISOString() } });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
