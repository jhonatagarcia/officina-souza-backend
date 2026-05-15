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
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { CreateBudgetUseCase } from 'src/budgets/use-cases/create-budget.use-case';
import { UpdateBudgetUseCase } from 'src/budgets/use-cases/update-budget.use-case';
import { ApproveBudgetUseCase } from 'src/budgets/use-cases/approve-budget.use-case';
import { RejectBudgetUseCase } from 'src/budgets/use-cases/reject-budget.use-case';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBudgetDto } from 'src/budgets/dto/create-budget.dto';
import { UpdateBudgetDto } from 'src/budgets/dto/update-budget.dto';
import { requireWorkshopId } from 'src/common/tenant/tenant-context';
import type { RequestUser } from 'src/common/types/request-user.type';

const BUDGET_ORDERABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'status',
  'total',
  'code',
] as const);

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createBudgetUseCase: CreateBudgetUseCase,
    private readonly updateBudgetUseCase: UpdateBudgetUseCase,
    private readonly approveBudgetUseCase: ApproveBudgetUseCase,
    private readonly rejectBudgetUseCase: RejectBudgetUseCase,
  ) {}

  async create(user: RequestUser, createBudgetDto: CreateBudgetDto): Promise<BudgetResponseDto> {
    const workshopId = requireWorkshopId(user);
    const budget = await this.createBudgetUseCase.execute(workshopId, createBudgetDto);

    return toBudgetResponseDto(budget);
  }

  async findAll(
    user: RequestUser,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<BudgetDetailResponseDto>> {
    const workshopId = requireWorkshopId(user);
    const where: Prisma.BudgetWhereInput = {
      workshopId,
      ...(pagination.search
        ? {
            OR: [
              { code: { contains: pagination.search, mode: 'insensitive' } },
              { problemDescription: { contains: pagination.search, mode: 'insensitive' } },
              { client: { name: { contains: pagination.search, mode: 'insensitive' } } },
              { vehicle: { plate: { contains: pagination.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(pagination.status ? { status: pagination.status as BudgetStatus } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: buildSafeOrderBy(
          BUDGET_ORDERABLE_FIELDS,
          pagination.sortBy,
          'createdAt',
          pagination.sortOrder,
        ),
        include: { client: true, vehicle: true, items: true, serviceOrder: true },
      }),
      this.prisma.budget.count({ where }),
    ]);

    return {
      data: data.map(toBudgetDetailResponseDto),
      meta: buildPaginationMeta(pagination, total),
    };
  }

  async findOne(user: RequestUser, id: string): Promise<BudgetDetailResponseDto> {
    const workshopId = requireWorkshopId(user);
    const budget = await this.prisma.budget.findUnique({
      where: { id_workshopId: { id, workshopId } },
      include: { client: true, vehicle: true, items: true, serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    return toBudgetDetailResponseDto(budget);
  }

  async update(
    user: RequestUser,
    id: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const workshopId = requireWorkshopId(user);
    const budget = await this.updateBudgetUseCase.execute(workshopId, id, updateBudgetDto);

    return toBudgetResponseDto(budget);
  }

  async approve(user: RequestUser, id: string): Promise<BudgetResponseDto> {
    const workshopId = requireWorkshopId(user);
    const budget = await this.approveBudgetUseCase.execute(workshopId, id);

    return toBudgetResponseDto({ ...budget, items: [] });
  }

  async reject(user: RequestUser, id: string): Promise<BudgetResponseDto> {
    const workshopId = requireWorkshopId(user);
    const budget = await this.rejectBudgetUseCase.execute(workshopId, id);

    return toBudgetResponseDto({ ...budget, items: [] });
  }

  async markConverted(workshopId: string, id: string, tx: Prisma.TransactionClient) {
    return tx.budget.update({
      where: { id_workshopId: { id, workshopId } },
      data: { convertedToServiceOrder: true },
    });
  }

  async assertCanConvert(workshopId: string, id: string, tx: Prisma.TransactionClient) {
    const budget = await tx.budget.findUnique({
      where: { id_workshopId: { id, workshopId } },
      include: { items: true, serviceOrder: true },
    });

    if (!budget) {
      throw new NotFoundException('Orcamento nao encontrado');
    }

    if (budget.status !== BudgetStatus.APROVADO) {
      throw new BadRequestException('Apenas orcamentos aprovados podem ser convertidos');
    }

    if (budget.convertedToServiceOrder || budget.serviceOrder) {
      throw new ConflictException('O orcamento ja foi convertido em ordem de servico');
    }

    return budget;
  }
}
