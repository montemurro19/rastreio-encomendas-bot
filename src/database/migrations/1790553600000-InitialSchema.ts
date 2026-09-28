import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790553600000 implements MigrationInterface {
  name = 'InitialSchema1790553600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."packages_status_enum" AS ENUM(
        'UNKNOWN',
        'POSTED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'DELAYED',
        'RETURNED',
        'CANCELLED',
        'EXCEPTION'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "telegram_user_id" character varying NOT NULL,
        "telegram_chat_id" character varying NOT NULL,
        "username" character varying,
        "first_name" character varying,
        "last_name" character varying,
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_users_id"
          PRIMARY KEY ("id"),

        CONSTRAINT "UQ_users_telegram_user_id"
          UNIQUE ("telegram_user_id"),

        CONSTRAINT "UQ_users_telegram_chat_id"
          UNIQUE ("telegram_chat_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "packages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "tracking_code" character varying NOT NULL,
        "carrier" character varying,
        "status" "public"."packages_status_enum"
          NOT NULL DEFAULT 'UNKNOWN',
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "tracking_enabled" boolean NOT NULL DEFAULT true,
        "last_event_hash" character varying,
        "last_checked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_packages_id"
          PRIMARY KEY ("id"),

        CONSTRAINT "FK_packages_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tracking_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "package_id" uuid NOT NULL,
        "status" "public"."packages_status_enum" NOT NULL,
        "description" text NOT NULL,
        "location" text,
        "event_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "event_hash" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_tracking_events_id"
          PRIMARY KEY ("id"),

        CONSTRAINT "UQ_package_event_hash"
          UNIQUE ("package_id", "event_hash"),

        CONSTRAINT "FK_tracking_events_package"
          FOREIGN KEY ("package_id")
          REFERENCES "packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_telegram_user_id"
      ON "users" ("telegram_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_telegram_chat_id"
      ON "users" ("telegram_chat_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_packages_user_id"
      ON "packages" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_packages_tracking_code"
      ON "packages" ("tracking_code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_packages_tracking_enabled"
      ON "packages" ("tracking_enabled")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_packages_last_checked_at"
      ON "packages" ("last_checked_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tracking_events_package_id"
      ON "tracking_events" ("package_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_tracking_events_event_date"
      ON "tracking_events" ("event_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "tracking_events"
    `);

    await queryRunner.query(`
      DROP TABLE "packages"
    `);

    await queryRunner.query(`
      DROP TABLE "users"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."packages_status_enum"
    `);
  }
}
