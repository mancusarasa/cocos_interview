import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderRepositoryPort } from '../application/ports/order.repository.port';
import { FilledOrder, OrderSide } from '../domain/filled-order';

@Injectable()
export class PrismaOrderRepository implements OrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findFilledByUserId(userId: number): Promise<FilledOrder[]> {
    const rows = await this.prisma.order.findMany({
      where: { userId, status: 'FILLED' },
      include: { instrument: true },
      orderBy: [{ datetime: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      instrumentId: row.instrumentId,
      ticker: row.instrument.ticker,
      name: row.instrument.name,
      instrumentType: row.instrument.type,
      side: row.side as OrderSide,
      size: row.size,
      price: row.price.toNumber(),
    }));
  }
}
