import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstrumentRepositoryPort } from '../application/ports/instrument.repository.port';

@Injectable()
export class PrismaInstrumentRepository implements InstrumentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<{ id: number; type: string } | null> {
    return this.prisma.instrument.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
  }
}
