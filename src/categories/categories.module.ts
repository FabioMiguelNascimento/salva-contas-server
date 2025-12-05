import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepositoryInterface } from './categories.interface';
import CategoriesRepository from './categories.repository';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    GetAllCategoriesUseCase,
    {
      provide: CategoriesRepositoryInterface,
      useClass: CategoriesRepository
    }
  ]
})
export class CategoriesModule {}
