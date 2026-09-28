import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Package } from '../entities/package.entity';

@Injectable()
export class PackagesRepository {
  constructor(
    @InjectRepository(Package)
    private readonly repo: Repository<Package>,
  ) {}

  async findById(
    id: string,
    relations?: FindOptionsRelations<Package>,
  ): Promise<Package | null> {
    return this.repo.findOne({
      where: { id },
      relations,
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
    relations?: FindOptionsRelations<Package>,
  ): Promise<Package | null> {
    return this.repo.findOne({
      where: { id, userId },
      relations,
    });
  }

  async findByUserId(userId: string): Promise<Package[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: { events: true },
    });
  }

  /**
   * Find packages that are enabled for automatic tracking.
   * If olderThan is passed, only returns packages that haven't been checked since that date (or never checked).
   */
  async findActiveForTracking(olderThan?: Date): Promise<Package[]> {
    const qb = this.repo
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.user', 'user')
      .where('package.tracking_enabled = :enabled', { enabled: true });

    if (olderThan) {
      qb.andWhere(
        '(package.last_checked_at IS NULL OR package.last_checked_at <= :olderThan)',
        { olderThan },
      );
    }

    return qb.getMany();
  }

  async create(packageData: Partial<Package>): Promise<Package> {
    const pkg = this.repo.create(packageData);
    return this.repo.save(pkg);
  }

  async update(id: string, updates: Partial<Package>): Promise<Package> {
    await this.repo.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Package with ID ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async save(pkg: Package): Promise<Package> {
    return this.repo.save(pkg);
  }
}
