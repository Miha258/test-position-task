import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Body,
} from '@nestjs/common';
import { PositionService } from './position.service';
import { Position } from '@prisma/client';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@ApiTags('positions')
@Controller('positions')
export class PositionController {
    constructor(private readonly positionService: PositionService) {}

    @Get('active/:userId')
    @ApiOperation({ summary: 'Отримати всі активні позиції користувача (Redis)' })
    async getAllActive(@Param('userId') userId: string): Promise<Position[]> {
        return this.positionService.getActivePositions(userId);
    }

    @Get('active/position/:id')
    @ApiOperation({ summary: 'Отримати одну активну позицію по ID (Redis)' })
    async getActiveById(
        @Param('id') positionId: string,
    ): Promise<Position | null> {
        return this.positionService.getActivePositionById(positionId);
    }

    @Get('history/:userId')
    @ApiOperation({ summary: 'Отримати історію позицій користувача (SQL)' })
    async getHistory(@Param('userId') userId: string): Promise<Position[]> {
        return this.positionService.getPositionHistory(userId);
    }

    @Post(':userId')
    @ApiOperation({ summary: 'Створити позицію (Redis + SQL)' })
    async createPosition(
        @Param('userId') userId: string,
        @Body() dto: CreatePositionDto,
    ): Promise<Position> {
        return this.positionService.createPosition(userId, dto);
    }

    @Put(':userId')
    @ApiOperation({ summary: 'Оновити позицію (Redis + SQL)' })
    async updatePosition(
        @Param('userId') userId: string,
        @Param('positionId') positionId: string,
        @Body() dto: UpdatePositionDto,
    ): Promise<Position> {
        return this.positionService.updatePosition(userId, positionId , dto);
    }
}
