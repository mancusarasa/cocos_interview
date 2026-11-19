import { Controller, Get, Query } from '@nestjs/common';
import { queryValidationPipe } from '../../common/validation/validation-pipes';
import { SearchInstrumentsUseCase } from '../application/search-instruments.use-case';
import { InstrumentsPageResponse } from './instruments-page.response';
import { SearchInstrumentsQueryDto } from './search-instruments.query';

@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly searchInstruments: SearchInstrumentsUseCase) {}

  @Get()
  async search(
    @Query(queryValidationPipe) query: SearchInstrumentsQueryDto,
  ): Promise<InstrumentsPageResponse> {
    const page = await this.searchInstruments.execute({
      term: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
    return InstrumentsPageResponse.from(page);
  }
}
