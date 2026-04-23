import { Module } from '@nestjs/common';
import { MechanicsController } from 'src/users/mechanics.controller';
import { UsersController } from 'src/users/users.controller';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [UsersController, MechanicsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
