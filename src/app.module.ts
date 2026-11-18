import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InstrumentsModule } from './instruments/instruments.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PortfolioModule,
    InstrumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
