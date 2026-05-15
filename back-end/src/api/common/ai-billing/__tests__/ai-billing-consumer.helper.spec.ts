import {
  AiBillingConsumer,
  OutOfCreditsError,
} from '../ai-billing-consumer.helper';
import type { AiBillingService } from '../ai-billing.service';
import { AiToolError } from '../../ai-tools/ai-tool.interface';

function buildBilling(over: Partial<AiBillingService>): AiBillingService {
  return {
    consumeCredit: jest.fn(),
    evaluateAutoTopup: jest.fn(),
    chargeTopup: jest.fn(),
    getSettings: jest.fn(async () => ({ is_sandbox: false } as any)),
    ...over,
  } as unknown as AiBillingService;
}

describe('AiBillingConsumer', () => {
  it('returns the consume result on success without touching auto-top-up', async () => {
    const billing = buildBilling({
      consumeCredit: jest.fn(async () => ({
        ok: true,
        amountChargedUsd: 0.05,
        multiplier: 1.5,
        balanceBefore: 5,
        balanceAfter: 4.95,
        ledgerId: 'led-1',
      })) as any,
      evaluateAutoTopup: jest.fn(),
      chargeTopup: jest.fn(),
    });
    const consumer = new AiBillingConsumer(billing);

    const out = await consumer.consumeOrTopup({
      companyId: 42,
      rawCostUsd: 0.0333,
    });

    expect(out.ok).toBe(true);
    expect(billing.evaluateAutoTopup).not.toHaveBeenCalled();
    expect(billing.chargeTopup).not.toHaveBeenCalled();
  });

  it('throws OutOfCreditsError (an AiToolError with code out_of_credits) when balance is insufficient and auto-top-up is disabled', async () => {
    const billing = buildBilling({
      consumeCredit: jest.fn(async () => ({
        ok: false,
        code: 'insufficient_credit',
        balanceUsd: 0.1,
        required: 0.5,
        message: 'no funds',
      })) as any,
      evaluateAutoTopup: jest.fn(async () => null) as any,
      chargeTopup: jest.fn(),
    });
    const consumer = new AiBillingConsumer(billing);

    const err = await consumer
      .consumeOrTopup({ companyId: 42, rawCostUsd: 0.5 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(OutOfCreditsError);
    expect(err).toBeInstanceOf(AiToolError);
    expect(err.code).toBe('out_of_credits');
    expect(err.balanceUsd).toBe(0.1);
    expect(err.requiredUsd).toBe(0.5);
    expect(billing.chargeTopup).not.toHaveBeenCalled();
  });

  it('triggers an auto top-up and retries when settings allow', async () => {
    const consume = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'insufficient_credit',
        balanceUsd: 0,
        required: 0.5,
        message: 'no funds',
      })
      .mockResolvedValueOnce({
        ok: true,
        amountChargedUsd: 0.5,
        multiplier: 1,
        balanceBefore: 10,
        balanceAfter: 9.5,
        ledgerId: 'led-2',
      });
    const billing = buildBilling({
      consumeCredit: consume as any,
      evaluateAutoTopup: jest.fn(async () => ({ amountUsd: 10 })) as any,
      chargeTopup: jest.fn(async () => ({ purchase: {}, balanceAfter: 10 })) as any,
    });
    const consumer = new AiBillingConsumer(billing);

    const out = await consumer.consumeOrTopup({
      companyId: 42,
      rawCostUsd: 0.5,
      isSandbox: true,
    });

    expect(out.ok).toBe(true);
    expect(billing.chargeTopup).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 42,
        creditsUsd: 10,
        trigger: 'auto_topup',
        isSandbox: true,
      }),
    );
    expect(consume).toHaveBeenCalledTimes(2);
  });

  it('resolves sandbox mode from persisted ai_billing_settings when caller omits isSandbox', async () => {
    const consume = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'insufficient_credit',
        balanceUsd: 0,
        required: 0.5,
        message: 'no funds',
      })
      .mockResolvedValueOnce({
        ok: true,
        amountChargedUsd: 0.5,
        multiplier: 1,
        balanceBefore: 10,
        balanceAfter: 9.5,
        ledgerId: 'led-3',
      });
    const getSettings = jest.fn(async () => ({ is_sandbox: true } as any));
    const billing = buildBilling({
      consumeCredit: consume as any,
      evaluateAutoTopup: jest.fn(async () => ({ amountUsd: 10 })) as any,
      chargeTopup: jest.fn(async () => ({ purchase: {}, balanceAfter: 10 })) as any,
      getSettings: getSettings as any,
    });
    const consumer = new AiBillingConsumer(billing);

    await consumer.consumeOrTopup({ companyId: 42, rawCostUsd: 0.5 });

    expect(getSettings).toHaveBeenCalledWith(42);
    expect(billing.chargeTopup).toHaveBeenCalledWith(
      expect.objectContaining({ isSandbox: true }),
    );
  });

  it('throws OutOfCreditsError when the Stripe top-up itself fails', async () => {
    const billing = buildBilling({
      consumeCredit: jest.fn(async () => ({
        ok: false,
        code: 'insufficient_credit',
        balanceUsd: 0,
        required: 0.5,
        message: 'no funds',
      })) as any,
      evaluateAutoTopup: jest.fn(async () => ({ amountUsd: 10 })) as any,
      chargeTopup: jest.fn(async () => {
        throw new Error('stripe declined');
      }) as any,
    });
    const consumer = new AiBillingConsumer(billing);

    await expect(
      consumer.consumeOrTopup({ companyId: 42, rawCostUsd: 0.5 }),
    ).rejects.toBeInstanceOf(OutOfCreditsError);
  });

  it('short-circuits cleanly for a $0 raw cost', async () => {
    const billing = buildBilling({
      consumeCredit: jest.fn(async () => ({
        ok: true,
        amountChargedUsd: 0,
        multiplier: 1.5,
        balanceBefore: 1,
        balanceAfter: 1,
        ledgerId: '',
      })) as any,
      evaluateAutoTopup: jest.fn(),
      chargeTopup: jest.fn(),
    });
    const consumer = new AiBillingConsumer(billing);

    const out = await consumer.consumeOrTopup({
      companyId: 42,
      rawCostUsd: 0,
    });
    expect(out.ok).toBe(true);
    expect(billing.evaluateAutoTopup).not.toHaveBeenCalled();
  });

  it('rejects negative raw costs', async () => {
    const consumer = new AiBillingConsumer(buildBilling({}));
    await expect(
      consumer.consumeOrTopup({ companyId: 42, rawCostUsd: -1 }),
    ).rejects.toThrow(/non-negative/);
  });
});
