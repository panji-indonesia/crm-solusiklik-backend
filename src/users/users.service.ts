import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async create(data: { name: string; email: string; password: string; role?: Role }) {
    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async update(id: string, data: { name?: string; email?: string; role?: Role }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}