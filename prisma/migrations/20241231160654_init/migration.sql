-- AlterTable
ALTER TABLE `Refresh_tokens` MODIFY `updated_at` TIMESTAMP(0) NOT NULL;

-- AlterTable
ALTER TABLE `Users` MODIFY `updated_at` TIMESTAMP(0) NOT NULL;
