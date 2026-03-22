import { ConfirmTransactionUseCase } from './confirm-transaction.use-case';

type MockRepo = {
  findDuplicateTransaction: jest.Mock;
  createTransaction: jest.Mock;
};

describe('ConfirmTransactionUseCase', () => {
  const sampleReceipt = {
    amount: 120.5,
    description: 'Conta de luz',
    category: 'utilities',
    type: 'expense',
    status: 'pending',
    dueDate: '25/03/2026',
    paymentDate: null,
    creditCardId: null,
    debitCardId: null,
  } as any;

  let mockRepo: MockRepo;
  let useCase: ConfirmTransactionUseCase;

  beforeEach(() => {
    mockRepo = {
      findDuplicateTransaction: jest.fn(),
      createTransaction: jest.fn(),
    };

    useCase = new ConfirmTransactionUseCase(mockRepo as any);
  });

  it('creates a new transaction when no duplicate exists', async () => {
    const createdTx = { id: 'tx-1', ...sampleReceipt };
    mockRepo.findDuplicateTransaction.mockResolvedValue(null);
    mockRepo.createTransaction.mockResolvedValue(createdTx);

    const result = await useCase.execute(sampleReceipt);

    expect(mockRepo.findDuplicateTransaction).toHaveBeenCalledWith(
      sampleReceipt,
    );
    expect(mockRepo.createTransaction).toHaveBeenCalledWith(sampleReceipt);
    expect(result).toEqual(createdTx);
  });

  it('returns existing transaction when duplicate is found', async () => {
    const existingTx = { id: 'tx-duplicate', ...sampleReceipt };
    mockRepo.findDuplicateTransaction.mockResolvedValue(existingTx);

    const result = await useCase.execute(sampleReceipt);

    expect(mockRepo.findDuplicateTransaction).toHaveBeenCalledWith(
      sampleReceipt,
    );
    expect(mockRepo.createTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(existingTx);
  });

  it('processes an array and skips duplicates per entry', async () => {
    const existingTx = { id: 'tx-dup', ...sampleReceipt };
    const newTx = { id: 'tx-new', ...sampleReceipt, description: 'Conta agua' };

    mockRepo.findDuplicateTransaction
      .mockResolvedValueOnce(existingTx)
      .mockResolvedValueOnce(null);
    mockRepo.createTransaction.mockResolvedValueOnce(newTx);

    const result = await useCase.execute([
      sampleReceipt,
      { ...sampleReceipt, description: 'Conta agua' },
    ]);

    expect(mockRepo.findDuplicateTransaction).toHaveBeenCalledTimes(2);
    expect(mockRepo.createTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual([existingTx, newTx]);
  });
});
