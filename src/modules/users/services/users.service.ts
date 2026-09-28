import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { User } from '../entities/user.entity';

export interface FindOrCreateUserData {
  telegramUserId: string;
  telegramChatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async findOrCreate(data: FindOrCreateUserData): Promise<User> {
    let user = await this.usersRepository.findByTelegramUserId(
      data.telegramUserId,
    );

    if (!user) {
      user = await this.usersRepository.findByTelegramChatId(
        data.telegramChatId,
      );
    }

    if (!user) {
      this.logger.log(
        `Registering new user with Telegram ID: ${data.telegramUserId}`,
      );
      user = await this.usersRepository.create({
        telegramUserId: data.telegramUserId,
        telegramChatId: data.telegramChatId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        notificationsEnabled: true,
      });
      return user;
    }

    // Update info if changed
    let hasChanges = false;
    if (data.username !== undefined && user.username !== data.username) {
      user.username = data.username;
      hasChanges = true;
    }
    if (data.firstName !== undefined && user.firstName !== data.firstName) {
      user.firstName = data.firstName;
      hasChanges = true;
    }
    if (data.lastName !== undefined && user.lastName !== data.lastName) {
      user.lastName = data.lastName;
      hasChanges = true;
    }
    if (user.telegramChatId !== data.telegramChatId) {
      user.telegramChatId = data.telegramChatId;
      hasChanges = true;
    }

    if (hasChanges) {
      user = await this.usersRepository.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByTelegramChatId(chatId: string): Promise<User | null> {
    return this.usersRepository.findByTelegramChatId(chatId);
  }

  async toggleNotifications(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    user.notificationsEnabled = !user.notificationsEnabled;
    return this.usersRepository.save(user);
  }

  async setNotifications(userId: string, enabled: boolean): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    user.notificationsEnabled = enabled;
    return this.usersRepository.save(user);
  }
}
