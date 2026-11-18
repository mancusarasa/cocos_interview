import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { bodyValidationPipe } from '../../common/validation/validation-pipes';
import { PlaceOrderUseCase } from '../application/place-order.use-case';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
  UserNotFoundError,
} from '../domain/errors';
import { PlacedOrder } from '../domain/order';
import { PlaceOrderDto, toPlaceOrderCommand } from './place-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly placeOrder: PlaceOrderUseCase) {}

  /** 201 with the stored order, also when it ends up REJECTED (see `status`). */
  @Post()
  async create(
    @Body(bodyValidationPipe) dto: PlaceOrderDto,
  ): Promise<PlacedOrder> {
    try {
      return await this.placeOrder.execute(toPlaceOrderCommand(dto));
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
