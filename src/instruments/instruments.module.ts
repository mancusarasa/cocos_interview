import { Module } from '@nestjs/common';
import { INSTRUMENT_REPOSITORY } from './application/ports/instrument.repository.port';
import { SearchInstrumentsUseCase } from './application/search-instruments.use-case';
import { InstrumentsController } from './infrastructure/instruments.controller';
import { PrismaInstrumentRepository } from './infrastructure/prisma-instrument.repository';

@Module({
  controllers: [InstrumentsController],
  providers: [
    SearchInstrumentsUseCase,
    { provide: INSTRUMENT_REPOSITORY, useClass: PrismaInstrumentRepository },
  ],
})
export class InstrumentsModule {}
