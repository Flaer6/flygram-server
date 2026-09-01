import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<Prisma.PrismaClientOptions> {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URbuL,
    });
    super({ adapter });
  }
}
