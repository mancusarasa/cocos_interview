import { Controller, Get, Query } from '@nestjs/common';
import { queryValidationPipe } from '../../common/validation/validation-pipes';
import {
  Page,
  SearchInstrumentsUseCase,
} from '../application/search-instruments.use-case';
import { Instrument } from '../domain/instrument';
import { SearchInstrumentsQueryDto } from './search-instruments.query';

@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly searchInstruments: SearchInstrumentsUseCase) {}

  @Get()
  search(
    @Query(queryValidationPipe) query: SearchInstrumentsQueryDto,
  ): Promise<Page<Instrument>> {
    return this.searchInstruments.execute({
      term: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
