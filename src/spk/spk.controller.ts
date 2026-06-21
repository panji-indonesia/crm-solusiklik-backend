import {
  Controller, Get, Post, Put, Param,
  Body, UseGuards,
} from '@nestjs/common';
import { SpkService } from './spk.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('spk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SpkController {
  constructor(private spkService: SpkService) {}

  @Get()
  @Roles('ADMIN', 'SALES', 'FINANCE')
  findAll(@CurrentUser() user: any) {
    return this.spkService.findAll(user);
  }

  @Get(':id')
  @Roles('ADMIN', 'SALES', 'FINANCE')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.spkService.findOne(id, user);
  }

  // Konversi Lead ke SPK
  @Post('convert/:leadId')
  @Roles('ADMIN', 'SALES')
  convert(@Param('leadId') leadId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.spkService.convertFromLead(leadId, user, body);
  }

  // Update SPK
  @Put(':id')
  @Roles('ADMIN', 'SALES')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.spkService.update(id, user, body);
  }

  // Kirim ke Finance
  @Put(':id/send')
  @Roles('ADMIN', 'SALES')
  send(@Param('id') id: string, @CurrentUser() user: any) {
    return this.spkService.sendToFinance(id, user);
  }

  // Finance Approve
  @Put(':id/approve')
  @Roles('ADMIN', 'FINANCE')
  approve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { notes?: string }) {
    return this.spkService.approve(id, user, body.notes);
  }

  // Finance Reject
  @Put(':id/reject')
  @Roles('ADMIN', 'FINANCE')
  reject(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { notes: string }) {
    return this.spkService.reject(id, user, body.notes);
  }
}