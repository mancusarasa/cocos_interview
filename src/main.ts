import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Run onModuleDestroy hooks (e.g. PrismaService.$disconnect) on SIGTERM/SIGINT,
  // which is how `docker stop` and orchestrators stop the container.
  app.enableShutdownHooks();

  const port = app.get(ConfigService).get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
