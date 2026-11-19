import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ParseIdPipe } from '../../common/validation/ids';
import { bodyValidationPipe } from '../../common/validation/validation-pipes';
import { CancelOrderUseCase } from '../application/cancel-order.use-case';
import { PlaceOrderUseCase } from '../application/place-order.use-case';
import {
  InstrumentNotFoundError,
  InvalidOrderError,
  MarketPriceUnavailableError,
  OrderNotCancellableError,
  OrderNotFoundError,
  UserNotFoundError,
} from '../domain/errors';
import { PlacedOrder } from '../domain/order';
import { PlaceOrderDto, toPlaceOrderCommand } from './place-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrder: PlaceOrderUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}

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

  /**
   * Cancels a NEW order. The order is not deleted: it is kept with status CANCELLED
   * and returned (200). 404 if it does not exist, 409 if it is not NEW.
   */
  @Delete(':orderId')
  async cancel(
    @Param('orderId', ParseIdPipe) orderId: number,
  ): Promise<PlacedOrder> {
    try {
      return await this.cancelOrder.execute(orderId);
    } catch (e) {
      if (e instanceof OrderNotFoundError) {
        throw new NotFoundException(e.message);
      }
      if (e instanceof OrderNotCancellableError) {
        throw new ConflictException(e.message);
      }
      throw e;
    }
  }
}
