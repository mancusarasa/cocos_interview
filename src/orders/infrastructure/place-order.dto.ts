import {
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  ValidateIf,
} from 'class-validator';
import { ExactlyOneOf } from '../../common/validation/exactly-one-of';
import {
  ORDER_TYPES,
  OrderQuantity,
  OrderType,
  PlaceOrderCommand,
  TRADE_SIDES,
  TradeSide,
} from '../domain/order';
import { MAX_PRICE, MAX_SIZE } from '../domain/place-order';

/**
 * Body of POST /orders. Validated by `bodyValidationPipe`.
 * Decorators run bottom-up: the type check is listed last so it is reported first.
 */
export class PlaceOrderDto {
  @IsPositive()
  @IsInt()
  userId!: number;

  @IsPositive()
  @IsInt()
  instrumentId!: number;

  @IsIn(TRADE_SIDES)
  side!: TradeSide;

  @IsIn(ORDER_TYPES)
  type!: OrderType;

  /** Exact number of shares. Exactly one of `size` / `amount` must be sent. */
  @Max(MAX_SIZE)
  @IsPositive()
  @IsInt()
  @ExactlyOneOf(['size', 'amount'])
  size?: number;

  /** Pesos to invest: the order is for the maximum number of whole shares it buys. */
  @IsPositive()
  @IsNumber()
  @ExactlyOneOf(['size', 'amount'])
  amount?: number;

  /** Required for LIMIT orders; ignored for MARKET orders. */
  @Max(MAX_PRICE)
  @IsPositive()
  @IsNumber({ maxDecimalPlaces: 2 })
  @ValidateIf((o: PlaceOrderDto) => o.type === 'LIMIT')
  price?: number;
}

function quantityOf(dto: PlaceOrderDto): OrderQuantity {
  if (dto.size !== undefined && dto.size !== null) return { size: dto.size };
  if (dto.amount !== undefined && dto.amount !== null) {
    return { amount: dto.amount };
  }
  // Unreachable once the DTO is validated (ExactlyOneOf).
  throw new Error('PlaceOrderDto has neither size nor amount');
}

/** Maps a validated DTO to the typed command the use case expects. */
export function toPlaceOrderCommand(dto: PlaceOrderDto): PlaceOrderCommand {
  const base = {
    userId: dto.userId,
    instrumentId: dto.instrumentId,
    side: dto.side,
    quantity: quantityOf(dto),
  };
  if (dto.type === 'MARKET') return { ...base, type: 'MARKET' };

  if (dto.price === undefined || dto.price === null) {
    // Unreachable once the DTO is validated (price is required for LIMIT).
    throw new Error('LIMIT PlaceOrderDto without price');
  }
  return { ...base, type: 'LIMIT', price: dto.price };
}
