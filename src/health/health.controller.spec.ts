import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

const controllerWith = (queryRaw: () => Promise<unknown>) =>
  new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);

describe('HealthController', () => {
  it('returns ok when the database answers', async () => {
    const controller = controllerWith(async () => [{ '?column?': 1 }]);
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });

  it('returns 503 when the database is not reachable', async () => {
    const controller = controllerWith(async () => {
      throw new Error("Can't reach database server");
    });
    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
