import { Controller, Get, Param } from '@nestjs/common';
import { ParseIdPipe } from '../../common/validation/ids';
import { GetPortfolioUseCase } from '../application/get-portfolio.use-case';
import { Portfolio } from '../domain/portfolio';

@Controller('users')
export class PortfolioController {
  constructor(private readonly getPortfolio: GetPortfolioUseCase) {}

  /** 404 for an unknown user (UserNotFoundError, mapped by DomainExceptionFilter). */
  @Get(':userId/portfolio')
  async portfolio(
    @Param('userId', ParseIdPipe) userId: number,
  ): Promise<Portfolio & { userId: number }> {
    return { userId, ...(await this.getPortfolio.execute(userId)) };
  }
}
