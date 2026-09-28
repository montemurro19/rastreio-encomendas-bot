import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da encomenda é obrigatório' })
  @Length(2, 100, {
    message: 'Nome da encomenda deve ter entre 2 e 100 caracteres',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Código de rastreamento é obrigatório' })
  trackingCode: string;

  @IsString()
  @IsOptional()
  carrier?: string;
}
