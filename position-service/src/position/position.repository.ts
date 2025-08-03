import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Position } from '@prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, dto: CreatePositionDto): Promise<Position> {
        return this.prisma.position.create({
            data: {
                ...dto,
                userId,
            },
        });
    }

    async update(positionId: string, dto: UpdatePositionDto): Promise<Position> {
        return this.prisma.position.update({
            where: { id: positionId },
            data: dto,
        });
    }

    async findManyByUser(userId: string): Promise<Position[]> {
        return this.prisma.position.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(positionId: string): Promise<Position | null> {
        return this.prisma.position.findUnique({
            where: { id: positionId },
        });
    }
}
