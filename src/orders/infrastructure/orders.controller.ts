import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PlaceOrderUseCase } from '../application/place-order.use-case';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
  UserNotFoundError,
} from '../domain/errors';
import { PlacedOrder } from '../domain/order';

@Controller('orders')
export class OrdersController {
  constructor(private readonly placeOrder: PlaceOrderUseCase) {}

  /** 201 with the stored order, also when it ends up REJECTED (see `status`). */
  @Post()
  async create(@Body() body: unknown): Promise<PlacedOrder> {
    try {
      return await this.placeOrder.execute(body);
    } catch (e) {
      if (e instanceof InvalidOrderError) {
        throw new BadRequestException(e.message);
      }
      if (
        e instanceof UserNotFoundError ||
        e instanceof InstrumentNotFoundError
      ) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof MarketPriceUnavailableError) {
        throw new UnprocessableEntityException(e.message);
      }
      throw e;
    }
  }
}
