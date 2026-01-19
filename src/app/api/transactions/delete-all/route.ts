import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '@/models/Transaction';
import { dbConnect } from '@/lib/dbConnect';
import { getUserIdFromRequest } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete all transactions for this user
    const result = await Transaction.deleteMany({ userId });

    return NextResponse.json({ 
      message: 'All transactions deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting transactions:', error);
    return NextResponse.json(
      { error: 'Failed to delete transactions' },
      { status: 500 }
    );
  }
}