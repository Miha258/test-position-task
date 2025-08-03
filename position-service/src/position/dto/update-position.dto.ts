import { PartialType } from '@nestjs/mapped-types';
import { CreatePositionDto } from './create-position.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNumber,
    IsOptional,
    IsPositive,
    Min,
    Max,
} from 'class-validator';

export class UpdatePositionDto extends PartialType(CreatePositionDto) {
    @ApiPropertyOptional({ example: 27000, description: 'Entry price' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    entry?: number;

    @ApiPropertyOptional({ example: 10, description: 'Leverage used (max 100x)' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    leverage?: number;

    @ApiPropertyOptional({ example: 100, description: 'User deposit amount' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    deposit?: number;

    @ApiPropertyOptional({ example: 29000, description: 'Take Profit level' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    takeProfit?: number;

    @ApiPropertyOptional({ example: 26000, description: 'Stop Loss level' })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    stopLoss?: number;
}
