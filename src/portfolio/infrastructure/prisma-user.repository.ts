import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepositoryPort } from '../application/ports/user.repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async exists(userId: number): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id: userId } })) > 0;
  }
}
