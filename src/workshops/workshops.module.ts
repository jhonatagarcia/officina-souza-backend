import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FiscalFeatureAccessService } from 'src/workshops/services/fiscal-feature-access.service';
import { WorkshopsController } from 'src/workshops/workshops.controller';
import { WorkshopsService } from 'src/workshops/workshops.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService, FiscalFeatureAccessService],
  exports: [WorkshopsService, FiscalFeatureAccessService],
})
export class WorkshopsModule {}
