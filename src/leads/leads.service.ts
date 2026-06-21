import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, Role } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) { }

  async findAll(user: any, query: {
    search?: string;
    status?: LeadStatus;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Sales hanya bisa lihat lead miliknya
    if (user.role === 'SALES') {
      where.salesId = user.id;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          sales: { select: { id: true, name: true, email: true } },
          spk: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        sales: { select: { id: true, name: true, email: true } },
        spk: true,
      },
    });

    if (!lead) throw new NotFoundException('Lead tidak ditemukan');
    if (user.role === 'SALES' && lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke lead ini');
    }

    return lead;
  }

  async create(user: any, data: {
    companyName: string;
    contactName: string;
    phone: string;
    email: string;
    source: string;
    estimatedValue: number;
    notes?: string;
  }) {
    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        salesId: user.id,
        status: 'NEW',
      },
    });

    await this.prisma.statusHistory.create({
      data: {
        entityType: 'LEAD',
        entityId: lead.id,
        oldStatus: null,
        newStatus: 'NEW',
        changedById: user.id,
        notes: 'Lead pertama kali dibuat',
      },
    });

    return lead;
  }

  async update(id: string, user: any, data: {
    companyName?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    source?: string;
    estimatedValue?: number;
    notes?: string;
    status?: LeadStatus;
  }) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { spk: true },
    });

    if (!lead) throw new NotFoundException('Lead tidak ditemukan');

    if (user.role === 'SALES' && lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke lead ini');
    }

    // Lead yang sudah punya SPK tidak bisa diubah statusnya (kecuali Admin)
    if (lead.spk && data.status && user.role !== 'ADMIN') {
      throw new BadRequestException(
        'Status lead tidak dapat diubah karena sudah memiliki SPK',
      );
    }

    // Lead status LOST tidak bisa diubah oleh Sales
    if (lead.status === 'LOST' && data.status && user.role === 'SALES') {
      throw new BadRequestException(
        'Lead berstatus LOST tidak dapat diubah oleh Sales',
      );
    }

    // Lead yang sudah punya SPK APPROVED tidak bisa diubah datanya sama sekali
    if (lead.spk?.financeStatus === 'APPROVED' && user.role !== 'ADMIN') {
      throw new BadRequestException(
        'Lead tidak dapat diubah karena SPK sudah disetujui Finance',
      );
    }

    const oldStatus = lead.status;
    const updated = await this.prisma.lead.update({
      where: { id },
      data,
    });

    // Catat riwayat kalau status berubah
    if (data.status && data.status !== oldStatus) {
      await this.prisma.statusHistory.create({
        data: {
          entityType: 'LEAD',
          entityId: id,
          oldStatus,
          newStatus: data.status,
          changedById: user.id,
          notes: data.notes || null,
        },
      });
    }

    return updated;
  }

  async delete(id: string, user: any) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan');

    if (user.role === 'SALES' && lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke lead ini');
    }

    return this.prisma.lead.delete({ where: { id } });
  }
}