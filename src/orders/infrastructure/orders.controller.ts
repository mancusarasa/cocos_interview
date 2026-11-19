import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ParseIdPipe } from '../../common/validation/ids';
import { bodyValidationPipe } from '../../common/validation/validation-pipes';
import { CancelOrderUseCase } from '../application/cancel-order.use-case';
import { PlaceOrderUseCase } from '../application/place-order.use-case';
import { OrderResponse } from './order.response';
import { PlaceOrderDto, toPlaceOrderCommand } from './place-order.dto';

/** Domain errors are turned into 400/404/409/422 by DomainExceptionFilter. */
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
  ): Promise<OrderResponse> {
    const order = await this.placeOrder.execute(toPlaceOrderCommand(dto));
    return OrderResponse.from(order);
  }

  /**
   * Cancels a NEW order. The order is not deleted: it is kept with status CANCELLED
   * and returned (200). 404 if it does not exist, 409 if it is not NEW.
   */
  @Delete(':orderId')
  async cancel(
    @Param('orderId', ParseIdPipe) orderId: number,
  ): Promise<OrderResponse> {
    return OrderResponse.from(await this.cancelOrder.execute(orderId));
  }
}
