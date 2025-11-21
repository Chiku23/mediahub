-- CreateTable
CREATE TABLE `MediaFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `size` INTEGER NULL,
    `hash` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'new',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
