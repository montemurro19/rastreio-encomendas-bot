import { Injectable, Logger } from '@nestjs/common';
import { ConversationStep, ConversationState } from './conversation.types';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private readonly states = new Map<string, ConversationState>();

  getState(chatId: string): ConversationState {
    const existing = this.states.get(chatId);
    if (existing) {
      return existing;
    }
    const defaultState: ConversationState = {
      step: ConversationStep.IDLE,
      data: {},
      updatedAt: new Date(),
    };
    this.states.set(chatId, defaultState);
    return defaultState;
  }

  setStep(chatId: string, step: ConversationStep): ConversationState {
    const current = this.getState(chatId);
    current.step = step;
    current.updatedAt = new Date();
    this.states.set(chatId, current);
    return current;
  }

  setData(chatId: string, key: string, value: any): ConversationState {
    const current = this.getState(chatId);
    current.data[key] = value;
    current.updatedAt = new Date();
    this.states.set(chatId, current);
    return current;
  }

  clearState(chatId: string): void {
    this.logger.debug(`Clearing conversation state for chat ${chatId}`);
    this.states.set(chatId, {
      step: ConversationStep.IDLE,
      data: {},
      updatedAt: new Date(),
    });
  }

  isInRegistration(chatId: string): boolean {
    const state = this.getState(chatId);
    return (
      state.step === ConversationStep.WAITING_PACKAGE_NAME ||
      state.step === ConversationStep.WAITING_TRACKING_CODE ||
      state.step === ConversationStep.VALIDATING
    );
  }
}
