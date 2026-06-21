import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { SpkModule } from './spk/spk.module';
import { AppController } from './app.controller';
import { StatusHistoryModule } from './status-history/status-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    SpkModule,
    StatusHistoryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}