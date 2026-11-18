import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderCancellationPort } from '../application/ports/order-cancellation.port';
import { PlacedOrder } from '../domain/order';
import { toPlacedOrder } from './order.mapper';

@Injectable()
export class PrismaOrderCancellationRepository implements OrderCancellationPort {
  constructor(private readonly prisma: PrismaService) {}

  async cancelIfNew(orderId: number): Promise<PlacedOrder | null> {
    // Conditional update: only one of several concurrent cancels can match `status: NEW`.
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'NEW' },
      data: { status: 'CANCELLED' },
    });
    return count === 1 ? this.findById(orderId) : null;
  }

  async findById(orderId: number): Promise<PlacedOrder | null> {
    const row = await this.prisma.order.findUnique({ where: { id: orderId } });
    return row ? toPlacedOrder(row) : null;
  }
}
