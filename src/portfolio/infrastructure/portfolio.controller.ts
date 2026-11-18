import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { GetPortfolioUseCase } from '../application/get-portfolio.use-case';
import { UserNotFoundError } from '../domain/errors';
import { Portfolio } from '../domain/portfolio';

@Controller('users')
export class PortfolioController {
  constructor(private readonly getPortfolio: GetPortfolioUseCase) {}

  @Get(':userId/portfolio')
  async portfolio(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<Portfolio & { userId: number }> {
    try {
      const portfolio = await this.getPortfolio.execute(userId);
      return { userId, ...portfolio };
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        throw new NotFoundException(e.message);
      }
      throw e;
    }
  }
}
