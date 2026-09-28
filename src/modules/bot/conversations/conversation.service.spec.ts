import { ConversationService } from './conversation.service';
import { ConversationStep } from './conversation.types';

describe('ConversationService (State Machine)', () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
  });

  it('should initialize with IDLE state', () => {
    const state = service.getState('chat-123');
    expect(state.step).toBe(ConversationStep.IDLE);
    expect(service.isInRegistration('chat-123')).toBe(false);
  });

  it('should transition steps properly', () => {
    service.setStep('chat-123', ConversationStep.WAITING_PACKAGE_NAME);
    expect(service.getState('chat-123').step).toBe(
      ConversationStep.WAITING_PACKAGE_NAME,
    );
    expect(service.isInRegistration('chat-123')).toBe(true);

    service.setData('chat-123', 'packageName', 'Teclado Mecânico');
    service.setStep('chat-123', ConversationStep.WAITING_TRACKING_CODE);

    const state = service.getState('chat-123');
    expect(state.step).toBe(ConversationStep.WAITING_TRACKING_CODE);
    expect(state.data.packageName).toBe('Teclado Mecânico');
  });

  it('should clear state on cancel', () => {
    service.setStep('chat-123', ConversationStep.WAITING_TRACKING_CODE);
    service.setData('chat-123', 'packageName', 'Mouse');

    service.clearState('chat-123');

    const state = service.getState('chat-123');
    expect(state.step).toBe(ConversationStep.IDLE);
    expect(state.data).toEqual({});
    expect(service.isInRegistration('chat-123')).toBe(false);
  });
});
