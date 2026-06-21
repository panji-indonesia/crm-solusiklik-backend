import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpkService {
  constructor(private prisma: PrismaService) { }

  // Generate nomor SPK otomatis: SPK-YYYYMMDD-XXXX
  private async generateSpkNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.spk.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `SPK-${dateStr}-${sequence}`;
  }

  async findAll(user: any) {
    const where: any = {};

    // Finance hanya lihat SPK yang sudah dikirim (SENT)
    if (user.role === 'FINANCE') {
      where.salesStatus = 'SENT';
    }

    // Sales hanya lihat SPK miliknya
    if (user.role === 'SALES') {
      where.lead = { salesId: user.id };
    }

    return this.prisma.spk.findMany({
      where,
      include: {
        lead: {
          include: {
            sales: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const spk = await this.prisma.spk.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            sales: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!spk) throw new NotFoundException('SPK tidak ditemukan');

    if (user.role === 'FINANCE' && spk.salesStatus !== 'SENT') {
      throw new ForbiddenException('Kamu tidak punya akses ke SPK ini');
    }

    const spkWithLead = spk as any;
    if (user.role === 'SALES' && spkWithLead.lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke SPK ini');
    }

    return spk;
  }

  // Konversi Lead menjadi SPK
  async convertFromLead(leadId: string, user: any, data: {
    projectName: string;
    contractValue: number;
    startDate: string;
    endDate: string;
  }) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { spk: true },
    });

    if (!lead) throw new NotFoundException('Lead tidak ditemukan');

    if (lead.status !== 'WON') {
      throw new BadRequestException('Hanya Lead berstatus WON yang dapat dikonversi menjadi SPK');
    }

    if (lead.spk) {
      throw new BadRequestException('Lead ini sudah memiliki SPK');
    }

    if (user.role === 'SALES' && lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke lead ini');
    }

    const spkNumber = await this.generateSpkNumber();

    const spk = await this.prisma.spk.create({
      data: {
        spkNumber,
        leadId,
        projectName: data.projectName,
        contractValue: data.contractValue,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        salesStatus: 'DRAFT',
        financeStatus: 'PENDING',
      },
    });

    await this.prisma.statusHistory.create({
      data: {
        entityType: 'SPK',
        entityId: spk.id,
        oldStatus: null,
        newStatus: 'DRAFT',
        changedById: user.id,
        notes: `SPK dibuat dari Lead: ${lead.companyName}`,
      },
    });

    return spk;
  }

  // Sales update SPK (hanya kalau belum APPROVED)
  async update(id: string, user: any, data: {
    projectName?: string;
    contractValue?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const spk = await this.prisma.spk.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!spk) throw new NotFoundException('SPK tidak ditemukan');

    if (spk.financeStatus === 'APPROVED') {
      throw new BadRequestException('SPK yang sudah disetujui tidak dapat diubah');
    }

    if (user.role === 'SALES' && spk.lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke SPK ini');
    }

    return this.prisma.spk.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  // Sales kirim SPK ke Finance
  async sendToFinance(id: string, user: any) {
    const spk = await this.prisma.spk.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!spk) throw new NotFoundException('SPK tidak ditemukan');

    if (user.role === 'SALES' && spk.lead.salesId !== user.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke SPK ini');
    }

    if (spk.salesStatus === 'SENT') {
      throw new BadRequestException('SPK sudah dikirim ke Finance');
    }

    const updated = await this.prisma.spk.update({
      where: { id },
      data: { salesStatus: 'SENT' },
    });

    await this.prisma.statusHistory.create({
      data: {
        entityType: 'SPK',
        entityId: id,
        oldStatus: 'DRAFT',
        newStatus: 'SENT',
        changedById: user.id,
        notes: 'SPK dikirim ke Finance untuk verifikasi',
      },
    });

    return updated;
  }

  // Finance approve SPK
  async approve(id: string, user: any, notes?: string) {
    const spk = await this.prisma.spk.findUnique({ where: { id } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan');

    if (spk.salesStatus !== 'SENT') {
      throw new BadRequestException('SPK belum dikirim oleh Sales');
    }

    if (spk.financeStatus === 'APPROVED') {
      throw new BadRequestException('SPK sudah disetujui');
    }

    const updated = await this.prisma.spk.update({
      where: { id },
      data: { financeStatus: 'APPROVED', financeNotes: notes || null },
    });

    await this.prisma.statusHistory.create({
      data: {
        entityType: 'SPK',
        entityId: id,
        oldStatus: spk.financeStatus,
        newStatus: 'APPROVED',
        changedById: user.id,
        notes: notes || 'SPK disetujui oleh Finance',
      },
    });

    return updated;
  }

  // Finance reject SPK
  async reject(id: string, user: any, notes: string) {
    if (!notes || notes.trim() === '') {
      throw new BadRequestException('Catatan wajib diisi saat menolak SPK');
    }

    const spk = await this.prisma.spk.findUnique({ where: { id } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan');

    if (spk.salesStatus !== 'SENT') {
      throw new BadRequestException('SPK belum dikirim oleh Sales');
    }

    const updated = await this.prisma.spk.update({
      where: { id },
      data: { financeStatus: 'REJECTED', financeNotes: notes },
    });

    await this.prisma.statusHistory.create({
      data: {
        entityType: 'SPK',
        entityId: id,
        oldStatus: spk.financeStatus,
        newStatus: 'REJECTED',
        changedById: user.id,
        notes,
      },
    });

    return updated;
  }
}