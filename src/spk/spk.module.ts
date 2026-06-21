import { Module } from '@nestjs/common';
import { SpkService } from './spk.service';
import { SpkController } from './spk.controller';

@Module({
  providers: [SpkService],
  controllers: [SpkController],
})
export class SpkModule {}