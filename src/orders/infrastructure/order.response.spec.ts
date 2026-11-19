import { OrderResponse } from './order.response';

describe('OrderResponse', () => {
  it('exposes exactly the API fields, with the datetime as an ISO string', () => {
    const response = OrderResponse.from({
      id: 7,
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'LIMIT',
      size: 5,
      price: 900,
      status: 'NEW',
      datetime: new Date('2023-07-13T12:00:00Z'),
    });

    expect(response).toBeInstanceOf(OrderResponse);
    expect(JSON.parse(JSON.stringify(response))).toEqual({
      id: 7,
      userId: 1,
      instrumentId: 47,
      side: 'BUY',
      type: 'LIMIT',
      size: 5,
      price: 900,
      status: 'NEW',
      datetime: '2023-07-13T12:00:00.000Z',
    });
  });
});
