import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Role } from 'src/common/enums/role.enum';
import { buildSafeOrderBy } from 'src/common/utils/order-by.util';
import { buildPaginationMeta, PaginatedResponse } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMechanicDto } from 'src/users/dto/create-mechanic.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { ListUsersQueryDto } from 'src/users/dto/list-users-query.dto';
import { UpdateMechanicDto } from 'src/users/dto/update-mechanic.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { UserResponseDto, toUserResponseDto } from 'src/users/dto/user-response.dto';

const USER_ORDERABLE_FIELDS = new Set([
  'name',
  'email',
  'role',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Usuario ja existe');
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      this.configService.getOrThrow<number>('auth.bcryptSaltRounds'),
    );

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email.toLowerCase(),
        passwordHash,
        role: createUserDto.role,
        isActive: createUserDto.isActive ?? true,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResponse<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.active !== undefined ? { isActive: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: buildSafeOrderBy(
          USER_ORDERABLE_FIELDS,
          query.sortBy,
          'createdAt',
          query.sortOrder,
        ),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => toUserResponseDto(this.sanitizeUser(user))),
      meta: buildPaginationMeta(query, total),
    };
  }

  async findAllMechanics(query: ListUsersQueryDto): Promise<PaginatedResponse<UserResponseDto>> {
    return this.findAll({ ...query, role: Role.MECANICO });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return this.sanitizeUser(user);
  }

  async findMechanicById(id: string): Promise<Omit<User, 'passwordHash'>> {
    const mechanic = await this.findById(id);

    if (mechanic.role !== Role.MECANICO) {
      throw new NotFoundException('Mecanico nao encontrado');
    }

    return mechanic;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    await this.findById(id);

    if (updateUserDto.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email.toLowerCase(),
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Usuario ja existe');
      }
    }

    const passwordHash = updateUserDto.password
      ? await bcrypt.hash(
          updateUserDto.password,
          this.configService.getOrThrow<number>('auth.bcryptSaltRounds'),
        )
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name !== undefined ? { name: updateUserDto.name } : {}),
        ...(updateUserDto.email !== undefined ? { email: updateUserDto.email.toLowerCase() } : {}),
        ...(updateUserDto.role !== undefined ? { role: updateUserDto.role } : {}),
        ...(updateUserDto.isActive !== undefined ? { isActive: updateUserDto.isActive } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return this.sanitizeUser(user);
  }

  async createMechanic(createMechanicDto: CreateMechanicDto): Promise<Omit<User, 'passwordHash'>> {
    const email = await this.generateMechanicEmail(createMechanicDto.name);
    const password = this.generateInternalPassword();

    return this.create({
      name: createMechanicDto.name,
      email,
      password,
      role: Role.MECANICO,
      isActive: createMechanicDto.isActive ?? true,
    });
  }

  async updateMechanic(
    id: string,
    updateMechanicDto: UpdateMechanicDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const mechanic = await this.findMechanicById(id);

    return this.update(mechanic.id, {
      ...(updateMechanicDto.name !== undefined ? { name: updateMechanicDto.name } : {}),
      ...(updateMechanicDto.isActive !== undefined ? { isActive: updateMechanicDto.isActive } : {}),
    });
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }

  private async generateMechanicEmail(name: string) {
    const normalizedName =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .slice(0, 40) || 'mecanico';

    let suffix = Date.now();

    while (true) {
      const email = `${normalizedName}.${suffix}@internal.local`;
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (!existing) return email;
      suffix += 1;
    }
  }

  private generateInternalPassword() {
    return randomBytes(12).toString('hex');
  }
}
