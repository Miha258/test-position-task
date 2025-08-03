import { IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
    @ApiProperty({ example: 'BTCUSDT', description: 'Trading pair symbol' })
    @IsString()
    symbol: string;

    @ApiProperty({ example: 'long', enum: ['long', 'short'] })
    @IsIn(['long', 'short'])
    side: 'long' | 'short';

    @ApiProperty({ example: 0.05 })
    @IsNumber()
    quantity: number;

    @ApiProperty({ example: 100  })
    @IsNumber()
    deposit: number;

    @ApiProperty({ example: 27000 })
    @IsNumber()
    entry: number;

    @ApiProperty({ example: 10 })
    @IsNumber()
    leverage: number;

    @ApiPropertyOptional({ example: 28000 })
    @IsOptional()
    @IsNumber()
    takeProfit?: number;

    @ApiPropertyOptional({ example: 26000 })
    @IsOptional()
    @IsNumber()
    stopLoss?: number;
}
