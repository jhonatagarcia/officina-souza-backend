import { User } from '@prisma/client';

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserResponseDto(user: Omit<User, 'passwordHash'>): UserResponseDto {
  return user;
}
