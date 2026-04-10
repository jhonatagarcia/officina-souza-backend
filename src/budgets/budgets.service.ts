import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetStatus, Prisma } from '@prisma/client';
import {
  BudgetDetailResponseDto,
  BudgetResponseDto,
  toBudgetDetailResponseDto,
  toBudgetResponseDto,
} from 'src/budgets/dto/budget-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { BudgetReaderService } from 'src/budgets/services/budget-reader.service';
import { CreateBudgetUseCase } from 'src/budgets/use-cases/create-budget.use-case';
import { UpdateBudgetUseCase } from 'src/budgets/use-cases/update-budget.use-case';
import { ApproveBudgetUseCase } from 'src/budgets/use-cases/approve-budget.use-case';
import { RejectBudgetUseCase } from 'src/budgets/use-cases/reject-budget.use-case';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from 'src/budgets/dto/create-budget.dto';
import { UpdateBudgetDto } from 'src/budgets/dto/update-budget.dto';

const BUDGET_ORDERABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'status', 'total', 'code']);

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetReader: BudgetReaderService,
    private readonly createBudgetUseCase: CreateBudgetUseCase,
    private readonly updateBudgetUseCase: UpdateBudgetUseCase,
    private readonly approveBudgetUseCase: ApproveBudgetUseCase,
    private readonly rejectBudgetUseCase: RejectBudgetUseCase,
  ) {}

  async create(createBudgetDto: CreateBudgetDto): Promise<BudgetResponseDto> {
    const budget = await this.createBudgetUseCase.execute(createBudgetDto);

    return toBudgetResponseDto(budget);
  }

  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponse<BudgetDetailResponseDto>> {
    const where: Prisma.BudgetWhereInput = pagination.search
      ? {
          OR: [
            { code: { contains: pagination.search, mode: 'insensitive' } },
            { problemDescription: { contains: pagination.search, mode: 'insensitive' } },
            { client: { name: { contains: pagination.search, mode: 'insensitive' } } },
            { vehicle: { plate: { contains: pagination.search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const sortBy = BUDGET_ORDERABLE_FIELDS.has(pagination.sortBy ?? '')
      ? (pagination.sortBy ?? 'createdAt')
      : 'createdAt';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { [sortBy]: pagination.sortOrder },
        include: { client: true, vehicle: true, items: true, serviceOrder: true },
      }),
      this.prisma.budget.count({ where }),
    ]);

    return {
      data: data.map(toBudgetDetailResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(id: string): Promise<BudgetDetailResponseDto> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { client: true, vehicle: true, items: true, serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return toBudgetDetailResponseDto(budget);
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto): Promise<BudgetResponseDto> {
    const budget = await this.updateBudgetUseCase.execute(id, updateBudgetDto);

    return toBudgetResponseDto(budget);
  }

  async approve(id: string): Promise<BudgetResponseDto> {
    const budget = await this.approveBudgetUseCase.execute(id);

    return toBudgetResponseDto({ ...budget, items: [] });
  }

  async reject(id: string): Promise<BudgetResponseDto> {
    const budget = await this.rejectBudgetUseCase.execute(id);

    return toBudgetResponseDto({ ...budget, items: [] });
  }

  async markConverted(id: string, tx: Prisma.TransactionClient) {
    return tx.budget.update({
      where: { id },
      data: { convertedToServiceOrder: true },
    });
  }

  async assertCanConvert(id: string, tx: Prisma.TransactionClient) {
    const budget = await tx.budget.findUnique({
      where: { id },
      include: { items: true, serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.status !== BudgetStatus.APROVADO) {
      throw new BadRequestException('Only approved budgets can be converted');
    }

    if (budget.convertedToServiceOrder || budget.serviceOrder) {
      throw new ConflictException('Budget already converted to service order');
    }

    return budget;
  }

  async ensureExists(id: string) {
    return this.budgetReader.ensureExists(id);
  }
}
