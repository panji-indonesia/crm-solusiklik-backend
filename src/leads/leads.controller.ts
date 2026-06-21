import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LeadStatus } from '@prisma/client';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  @Roles('ADMIN', 'SALES')
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: LeadStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leadsService.findAll(user, { search, status, page, limit });
  }

  @Get(':id')
  @Roles('ADMIN', 'SALES')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN', 'SALES')
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.leadsService.create(user, body);
  }

  @Put(':id')
  @Roles('ADMIN', 'SALES')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.leadsService.update(id, user, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SALES')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.delete(id, user);
  }
}