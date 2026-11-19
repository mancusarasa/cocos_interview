import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ParseIdPipe } from '../../common/validation/ids';
import { bodyValidationPipe } from '../../common/validation/validation-pipes';
import { CancelOrderUseCase } from '../application/cancel-order.use-case';
import { PlaceOrderUseCase } from '../application/place-order.use-case';
import { PlacedOrder } from '../domain/order';
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
  create(@Body(bodyValidationPipe) dto: PlaceOrderDto): Promise<PlacedOrder> {
    return this.placeOrder.execute(toPlaceOrderCommand(dto));
  }

  /**
   * Cancels a NEW order. The order is not deleted: it is kept with status CANCELLED
   * and returned (200). 404 if it does not exist, 409 if it is not NEW.
   */
  @Delete(':orderId')
  cancel(@Param('orderId', ParseIdPipe) orderId: number): Promise<PlacedOrder> {
    return this.cancelOrder.execute(orderId);
  }
}
