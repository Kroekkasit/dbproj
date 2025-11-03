-- Migration script for Delivery Plans and Optional Services
USE parcel_delivery;

-- Step 1: Create DeliveryPlan table
CREATE TABLE IF NOT EXISTS `DeliveryPlan` (
  `PlanID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(50) NOT NULL UNIQUE,
  `Description` TEXT,
  `FastDeliveryFee` DECIMAL(10, 2) DEFAULT 0.00,
  `DeliveryDaysReduction` INT DEFAULT 0,
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create OptionalService table
CREATE TABLE IF NOT EXISTS `OptionalService` (
  `ServiceID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(100) NOT NULL UNIQUE,
  `Description` TEXT,
  `ServiceFee` DECIMAL(10, 2) NOT NULL,
  `CoverageAmount` DECIMAL(10, 2),
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Add columns to Parcel table
ALTER TABLE `Parcel` 
  ADD COLUMN `DeliveryPlanID` INT DEFAULT NULL AFTER `PackagePrice`,
  ADD COLUMN `FastDeliveryFee` DECIMAL(10, 2) DEFAULT 0.00 AFTER `DeliveryPlanID`,
  ADD COLUMN `ServiceFee` DECIMAL(10, 2) DEFAULT 0.00 AFTER `FastDeliveryFee`;

-- Step 4: Add foreign key for DeliveryPlanID
ALTER TABLE `Parcel` 
  ADD CONSTRAINT `Parcel_ibfk_delivery_plan`
  FOREIGN KEY (`DeliveryPlanID`) REFERENCES `DeliveryPlan` (`PlanID`) ON DELETE SET NULL;

-- Step 5: Create ParcelService table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS `ParcelService` (
  `ParcelServiceID` INT AUTO_INCREMENT PRIMARY KEY,
  `ParcelID` INT NOT NULL,
  `ServiceID` INT NOT NULL,
  `ServiceFee` DECIMAL(10, 2) NOT NULL,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE,
  FOREIGN KEY (`ServiceID`) REFERENCES `OptionalService` (`ServiceID`) ON DELETE CASCADE,
  UNIQUE KEY `unique_parcel_service` (`ParcelID`, `ServiceID`)
);

-- Step 6: Insert initial Delivery Plans
INSERT INTO `DeliveryPlan` (`Name`, `Description`, `FastDeliveryFee`, `DeliveryDaysReduction`) VALUES
('Standard', 'Standard delivery service with regular handling', 0.00, 0),
('Fast', 'Express delivery service with priority handling and faster transit', 50.00, 1)
ON DUPLICATE KEY UPDATE Name = Name;

-- Step 7: Insert initial Optional Services
INSERT INTO `OptionalService` (`Name`, `Description`, `ServiceFee`, `CoverageAmount`) VALUES
('Care+', 'Package insurance coverage for lost, stolen, or damaged items during transit', 25.00, 5000.00)
ON DUPLICATE KEY UPDATE Name = Name;

-- Step 8: Create indexes for better performance
CREATE INDEX idx_parcel_delivery_plan ON Parcel(DeliveryPlanID);
CREATE INDEX idx_parcel_service_parcel ON ParcelService(ParcelID);
CREATE INDEX idx_parcel_service_service ON ParcelService(ServiceID);

