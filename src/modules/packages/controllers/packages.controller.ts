import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { PackagesService } from '../services/packages.service';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post()
  async create(
    @Headers('x-user-id') userId: string,
    @Body() createPackageDto: CreatePackageDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.createPackage(userId, createPackageDto);
  }

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.getUserPackages(userId);
  }

  @Get(':id')
  async findOne(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.getPackageById(userId, id);
  }

  @Patch(':id')
  async update(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdatePackageDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.updatePackage(userId, id, updateDto);
  }

  @Delete(':id')
  async remove(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.deletePackage(userId, id);
  }

  @Post(':id/track')
  async manualTrack(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    return this.packagesService.manualUpdate(userId, id);
  }
}
