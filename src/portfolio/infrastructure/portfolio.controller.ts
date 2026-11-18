import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ParseIdPipe } from '../../common/validation/ids';
import { GetPortfolioUseCase } from '../application/get-portfolio.use-case';
import { UserNotFoundError } from '../domain/errors';
import { Portfolio } from '../domain/portfolio';

@Controller('users')
export class PortfolioController {
  constructor(private readonly getPortfolio: GetPortfolioUseCase) {}

  @Get(':userId/portfolio')
  async portfolio(
    @Param('userId', ParseIdPipe) userId: number,
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
