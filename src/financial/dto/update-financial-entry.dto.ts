import { PartialType } from '@nestjs/swagger';
import { CreateFinancialEntryDto } from 'src/financial/dto/create-financial-entry.dto';

export class UpdateFinancialEntryDto extends PartialType(CreateFinancialEntryDto) {}
