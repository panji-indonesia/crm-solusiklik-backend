import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getStats(@CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    const isSales = user.role === 'SALES';

    const leadWhere = isSales ? { salesId: user.id } : {};
    const spkWhere = isSales ? { lead: { salesId: user.id } } : {};

    const [
      totalLeads,
      wonLeads,
      totalSpk,
      approvedSpk,
      pendingSpk,
      rejectedSpk,
    ] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.lead.count({ where: { ...leadWhere, status: 'WON' } }),
      this.prisma.spk.count({ where: spkWhere }),
      this.prisma.spk.count({ where: { ...spkWhere, financeStatus: 'APPROVED' } }),
      this.prisma.spk.count({ where: { ...spkWhere, financeStatus: 'PENDING' } }),
      this.prisma.spk.count({ where: { ...spkWhere, financeStatus: 'REJECTED' } }),
    ]);

    return {
      totalLeads,
      wonLeads,
      totalSpk,
      approvedSpk,
      pendingSpk,
      rejectedSpk,
    };
  }
}