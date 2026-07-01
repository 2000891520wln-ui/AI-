ALTER TABLE "inspiration_images" ALTER COLUMN "image_data_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inspiration_images" ADD COLUMN "user_id" text DEFAULT 'local-dev-user' NOT NULL;--> statement-breakpoint
ALTER TABLE "inspiration_images" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "inspiration_images" ADD COLUMN "storage_path" text;