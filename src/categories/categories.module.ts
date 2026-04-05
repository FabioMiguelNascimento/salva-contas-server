import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepositoryInterface } from './categories.interface';
import CategoriesRepository from './categories.repository';
import CreateCategoryUseCase from './use-cases/create-category.use-case';
import DeleteCategoryUseCase from './use-cases/delete-category.use-case';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import { PrismaModule } from 'src/prisma/prisma.module';
import UpdateCategoryUseCase from './use-cases/update-category.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    GetAllCategoriesUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    {
      provide: CategoriesRepositoryInterface,
      useClass: CategoriesRepository,
    },
  ],
})
export class CategoriesModule {}
