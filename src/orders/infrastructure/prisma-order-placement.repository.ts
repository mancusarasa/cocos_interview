import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderSide } from '../../shared/ledger';
import {
  OrderLedger,
  OrderPlacementPort,
} from '../application/ports/order-placement.port';
import { UserNotFoundError } from '../domain/errors';
import { toPlacedOrder } from './order.mapper';

@Injectable()
export class PrismaOrderPlacementRepository implements OrderPlacementPort {
  constructor(private readonly prisma: PrismaService) {}

  withUserLock<T>(
    userId: number,
    work: (ledger: OrderLedger) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Row lock on the user: concurrent orders of the same user wait here, so the
      // funds check below always sees the previous order's effects.
      const locked = await tx.$queryRaw<
        { id: number }[]
      >`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      if (locked.length === 0) throw new UserNotFoundError(userId);

      return work({
        findFilledEntries: async (uid) => {
          const rows = await tx.order.findMany({
            where: { userId: uid, status: 'FILLED' },
            select: { instrumentId: true, side: true, size: true, price: true },
          });
          return rows.map((r) => ({
            instrumentId: r.instrumentId,
            side: r.side as OrderSide,
            size: r.size,
            price: r.price.toNumber(),
          }));
        },
        save: async (order) => {
          const row = await tx.order.create({ data: order });
          return toPlacedOrder(row);
        },
      });
    });
  }
}
