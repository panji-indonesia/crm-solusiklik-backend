import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatusHistoryController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'SALES', 'FINANCE')
  async findAll(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }

    // Finance hanya lihat history SPK
    if (user.role === 'FINANCE') {
      where.entityType = 'SPK';
    }

    // Sales: ambil lead & spk miliknya dulu, lalu filter by entityId
    if (user.role === 'SALES') {
      const [myLeads, mySpks] = await Promise.all([
        this.prisma.lead.findMany({
          where: { salesId: user.id },
          select: { id: true },
        }),
        this.prisma.spk.findMany({
          where: { lead: { salesId: user.id } },
          select: { id: true },
        }),
      ]);

      const myEntityIds = [
        ...myLeads.map((l) => l.id),
        ...mySpks.map((s) => s.id),
      ];

      where.entityId = { in: myEntityIds };
    }

    const [data, total] = await Promise.all([
      this.prisma.statusHistory.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { changedAt: 'desc' },
        include: {
          changedBy: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.statusHistory.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }
}