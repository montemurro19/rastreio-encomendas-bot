import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByTelegramUserId(telegramUserId: string): Promise<User | null> {
    return this.repo.findOne({ where: { telegramUserId } });
  }

  async findByTelegramChatId(telegramChatId: string): Promise<User | null> {
    return this.repo.findOne({ where: { telegramChatId } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return this.repo.save(user);
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    await this.repo.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }
}
