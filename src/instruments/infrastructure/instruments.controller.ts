import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  Page,
  SearchInstrumentsUseCase,
} from '../application/search-instruments.use-case';
import { InvalidSearchQueryError } from '../domain/errors';
import { Instrument } from '../domain/instrument';

@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly searchInstruments: SearchInstrumentsUseCase) {}

  @Get()
  async search(
    @Query('search') search: unknown,
    @Query('page', new DefaultValuePipe(DEFAULT_PAGE), ParseIntPipe)
    page: number,
    @Query('pageSize', new DefaultValuePipe(DEFAULT_PAGE_SIZE), ParseIntPipe)
    pageSize: number,
  ): Promise<Page<Instrument>> {
    try {
      return await this.searchInstruments.execute({ search, page, pageSize });
    } catch (e) {
      if (e instanceof InvalidSearchQueryError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }
}
