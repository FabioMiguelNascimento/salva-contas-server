import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepositoryInterface } from './categories.interface';
import CategoriesRepository from './categories.repository';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import { PrismaModule } from 'src/prisma/prisma.module';
import UpdateCategoryUseCase from './use-cases/update-category.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    GetAllCategoriesUseCase,
    UpdateCategoryUseCase,
    {
      provide: CategoriesRepositoryInterface,
      useClass: CategoriesRepository
    }
  ]
})
export class CategoriesModule {}
