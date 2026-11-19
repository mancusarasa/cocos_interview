import { Module } from '@nestjs/common';
import { INSTRUMENT_REPOSITORY } from './application/ports/instrument.repository.port';
import { SearchInstrumentsUseCase } from './application/search-instruments.use-case';
import { InstrumentsController } from './infrastructure/instruments.controller';
import { PrismaInstrumentRepository } from './infrastructure/prisma-instrument.repository';

@Module({
  controllers: [InstrumentsController],
  providers: [
    SearchInstrumentsUseCase,
    PrismaInstrumentRepository,
    { provide: INSTRUMENT_REPOSITORY, useExisting: PrismaInstrumentRepository },
  ],
  // Instrument persistence is owned by this feature; other features (orders) reuse it.
  exports: [PrismaInstrumentRepository],
})
export class InstrumentsModule {}
