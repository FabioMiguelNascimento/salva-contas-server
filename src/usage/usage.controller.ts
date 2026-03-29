import { Controller, Get } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { success } from 'src/utils/api-response-helper';
import { GetUsageUseCase } from './use-cases/get-usage.use-case';

@Controller('usage')
export class UsageController {
  constructor(
    private readonly getUsageUseCase: GetUsageUseCase,
    private readonly userContext: UserContext,
  ) {}

  @Get()
  async getUsage() {
    const localUser = await this.userContext.localUser;
    const usageData = await this.getUsageUseCase.execute(
      this.userContext.actorUserId,
      localUser.planTier,
    );
    return success(usageData, 'Uso da conta recuperado com sucesso');
  }
}
