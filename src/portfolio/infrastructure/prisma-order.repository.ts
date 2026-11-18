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

    return rows.map((row) => {
      const side = row.side as OrderSide;
      const isCash = side === 'CASH_IN' || side === 'CASH_OUT';
      if (!isCash && row.price === null) {
        // A FILLED BUY/SELL without price cannot be valued: fail loudly.
        throw new Error(`FILLED order ${row.id} has no price`);
      }
      return {
        instrumentId: row.instrumentId,
        ticker: row.instrument.ticker,
        name: row.instrument.name,
        instrumentType: row.instrument.type,
        side,
        size: row.size,
        // Cash movements use `size` only, price is irrelevant for them.
        price: row.price?.toNumber() ?? 0,
      };
    });
  }
}
