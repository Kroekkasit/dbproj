-- Create database
CREATE DATABASE IF NOT EXISTS parcel_delivery;
USE parcel_delivery;

-- User table (Senders)
CREATE TABLE IF NOT EXISTS `User` (
  `UserID` INT AUTO_INCREMENT PRIMARY KEY,
  `Username` VARCHAR(255),
  `firstname` VARCHAR(255) NOT NULL,
  `lastname` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `LocationID` INT,
  `balance` DECIMAL(10, 2) DEFAULT 0.00,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `point` INT DEFAULT 0
);

-- Carrier table
CREATE TABLE IF NOT EXISTS `Carrier` (
  `CarrierID` INT AUTO_INCREMENT PRIMARY KEY,
  `firstname` VARCHAR(255) NOT NULL,
  `lastname` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `vehInfo` VARCHAR(255),
  `vehLicense` VARCHAR(255),
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `AssignedHubID` INT,
  `EmploymentType` VARCHAR(255),
  `isAvailable` BOOLEAN DEFAULT TRUE
);

-- Location table (normalized - shared locations)
-- Note: Uniqueness is enforced at application level due to MySQL key length limits
CREATE TABLE IF NOT EXISTS `Location` (
  `LocationID` INT AUTO_INCREMENT PRIMARY KEY,
  `Address` VARCHAR(500) NOT NULL,
  `District` VARCHAR(255),
  `Subdistrict` VARCHAR(255),
  `Province` VARCHAR(255),
  `Country` VARCHAR(255) DEFAULT 'Thailand',
  `latitude` DECIMAL(10, 8),
  `longitude` DECIMAL(11, 8),
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- UserLocation table (association table for user-location relationship)
CREATE TABLE IF NOT EXISTS `UserLocation` (
  `UserLocationID` INT AUTO_INCREMENT PRIMARY KEY,
  `UserID` INT NOT NULL,
  `LocationID` INT NOT NULL,
  `Name` VARCHAR(255) NOT NULL,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`UserID`) REFERENCES `User` (`UserID`) ON DELETE CASCADE,
  FOREIGN KEY (`LocationID`) REFERENCES `Location` (`LocationID`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_location` (`UserID`, `LocationID`)
);

-- Province dictionary table
CREATE TABLE IF NOT EXISTS `Province` (
  `ProvinceID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(255) NOT NULL UNIQUE,
  `Code` VARCHAR(10),
  `BasePrice` DECIMAL(10, 2) DEFAULT 50.00,
  `DeliveryDays` INT DEFAULT 3,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Province to Province mapping table for pricing and delivery
CREATE TABLE IF NOT EXISTS `ProvinceMapping` (
  `MappingID` INT AUTO_INCREMENT PRIMARY KEY,
  `OriginProvinceID` INT NOT NULL,
  `DestProvinceID` INT NOT NULL,
  `Price` DECIMAL(10, 2) NOT NULL,
  `DeliveryDays` INT NOT NULL,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`OriginProvinceID`) REFERENCES `Province` (`ProvinceID`),
  FOREIGN KEY (`DestProvinceID`) REFERENCES `Province` (`ProvinceID`),
  UNIQUE KEY `unique_mapping` (`OriginProvinceID`, `DestProvinceID`)
);

-- Bank table for topup
CREATE TABLE IF NOT EXISTS `Bank` (
  `BankID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(255) NOT NULL,
  `Code` VARCHAR(50),
  `Logo` VARCHAR(255),
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transaction table for balance topup
CREATE TABLE IF NOT EXISTS `Transaction` (
  `TransactionID` INT AUTO_INCREMENT PRIMARY KEY,
  `UserID` INT NOT NULL,
  `BankID` INT,
  `Type` VARCHAR(50) NOT NULL,
  `Amount` DECIMAL(10, 2) NOT NULL,
  `Status` VARCHAR(50) DEFAULT 'Completed',
  `Reference` VARCHAR(255),
  `Description` TEXT,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`UserID`) REFERENCES `User` (`UserID`) ON DELETE CASCADE,
  FOREIGN KEY (`BankID`) REFERENCES `Bank` (`BankID`)
);

-- PackageType table for available packaging containers
CREATE TABLE IF NOT EXISTS `PackageType` (
  `PackageTypeID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(255) NOT NULL,
  `Type` VARCHAR(50) NOT NULL, -- 'Envelope' or 'Box'
  `Size` VARCHAR(10), -- 'S', 'M', 'L', 'XL' for boxes, NULL for envelope
  `dimension_x` DOUBLE NOT NULL,
  `dimension_y` DOUBLE NOT NULL,
  `dimension_z` DOUBLE NOT NULL,
  `Price` DECIMAL(10, 2) NOT NULL,
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parcel table
CREATE TABLE IF NOT EXISTS `Parcel` (
  `ParcelID` INT AUTO_INCREMENT PRIMARY KEY,
  `SenderID` INT NOT NULL,
  `TrackingNumber` VARCHAR(255) UNIQUE NOT NULL,
  `Status` VARCHAR(255) DEFAULT 'Pending',
  `weight` DOUBLE,
  `dimension_x` DOUBLE,
  `dimension_y` DOUBLE,
  `dimension_z` DOUBLE,
  `EstDeliveryDate` DATETIME,
  `Price` DECIMAL(10, 2),
  `receiverName` VARCHAR(255),
  `receiverPhone` VARCHAR(255),
  `itemType` VARCHAR(50), -- 'Food', 'Frozen', 'Electronics', 'Clothing', 'Documents', 'Other'
  `SelectedPackageID` INT, -- NULL if using own package
  `PackagePrice` DECIMAL(10, 2) DEFAULT 0.00, -- Price of package if purchased
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`SenderID`) REFERENCES `User` (`UserID`) ON DELETE CASCADE,
  FOREIGN KEY (`SelectedPackageID`) REFERENCES `PackageType` (`PackageTypeID`)
);

-- ParcelLocation table (association table for parcel-location relationship)
CREATE TABLE IF NOT EXISTS `ParcelLocation` (
  `ParcelLocationID` INT AUTO_INCREMENT PRIMARY KEY,
  `ParcelID` INT NOT NULL,
  `LocationID` INT NOT NULL,
  `LocationType` ENUM('Origin', 'Destination') NOT NULL,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE,
  FOREIGN KEY (`LocationID`) REFERENCES `Location` (`LocationID`) ON DELETE CASCADE,
  UNIQUE KEY `unique_parcel_location_type` (`ParcelID`, `LocationType`)
);

-- ParcelAssignment table
CREATE TABLE IF NOT EXISTS `ParcelAssignment` (
  `AssignmentID` INT AUTO_INCREMENT PRIMARY KEY,
  `CarrierID` INT,
  `ParcelID` INT NOT NULL,
  `AssignedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `Status` VARCHAR(255) DEFAULT 'Pending',
  FOREIGN KEY (`CarrierID`) REFERENCES `Carrier` (`CarrierID`) ON DELETE SET NULL,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE
);

-- ShipmentEvent table
CREATE TABLE IF NOT EXISTS `ShipmentEvent` (
  `EventID` INT AUTO_INCREMENT PRIMARY KEY,
  `EventType` VARCHAR(255) NOT NULL,
  `Status` VARCHAR(255) NOT NULL,
  `Description` TEXT,
  `EventTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ParcelID` INT NOT NULL,
  `LocationID` INT,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE,
  FOREIGN KEY (`LocationID`) REFERENCES `Location` (`LocationID`)
);

-- Warehouse table
CREATE TABLE IF NOT EXISTS `Warehouse` (
  `WarehouseID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(255) NOT NULL,
  `Code` VARCHAR(50),
  `LocationID` INT NOT NULL,
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`LocationID`) REFERENCES `Location` (`LocationID`) ON DELETE RESTRICT
);

-- Route table
CREATE TABLE IF NOT EXISTS `Route` (
  `RouteID` INT AUTO_INCREMENT PRIMARY KEY,
  `ParcelID` INT NOT NULL,
  `CarrierID` INT,
  `RouteDate` DATETIME,
  `StartTime` DATETIME,
  `Status` VARCHAR(255) DEFAULT 'Planning',
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE,
  FOREIGN KEY (`CarrierID`) REFERENCES `Carrier` (`CarrierID`) ON DELETE SET NULL
);

-- RouteStop table
CREATE TABLE IF NOT EXISTS `RouteStop` (
  `StopID` INT AUTO_INCREMENT PRIMARY KEY,
  `Sequence` INT NOT NULL,
  `ETA` DATETIME,
  `AAT` DATETIME,
  `StopStatus` VARCHAR(255) DEFAULT 'Pending',
  `RouteID` INT NOT NULL,
  `ParcelID` INT,
  `LocationID` INT NOT NULL,
  `WarehouseID` INT,
  FOREIGN KEY (`RouteID`) REFERENCES `Route` (`RouteID`) ON DELETE CASCADE,
  FOREIGN KEY (`LocationID`) REFERENCES `Location` (`LocationID`) ON DELETE RESTRICT,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE SET NULL,
  FOREIGN KEY (`WarehouseID`) REFERENCES `Warehouse` (`WarehouseID`) ON DELETE SET NULL
);

-- Notification table
CREATE TABLE IF NOT EXISTS `Notification` (
  `NotificationID` INT AUTO_INCREMENT PRIMARY KEY,
  `UserID` INT,
  `CarrierID` INT,
  `Type` VARCHAR(255) NOT NULL,
  `Title` VARCHAR(255) NOT NULL,
  `Message` TEXT NOT NULL,
  `IsRead` BOOLEAN DEFAULT FALSE,
  `ParcelID` INT,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`UserID`) REFERENCES `User` (`UserID`) ON DELETE CASCADE,
  FOREIGN KEY (`CarrierID`) REFERENCES `Carrier` (`CarrierID`) ON DELETE CASCADE,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX idx_parcel_tracking ON Parcel(TrackingNumber);
CREATE INDEX idx_parcel_status ON Parcel(Status);
CREATE INDEX idx_shipment_parcel ON ShipmentEvent(ParcelID);
CREATE INDEX idx_notification_user ON Notification(UserID);
CREATE INDEX idx_notification_carrier ON Notification(CarrierID);
CREATE INDEX idx_transaction_user ON Transaction(UserID);

-- Insert sample package types
INSERT INTO `PackageType` (`Name`, `Type`, `Size`, `dimension_x`, `dimension_y`, `dimension_z`, `Price`) VALUES
('Envelope', 'Envelope', NULL, 30, 20, 2, 10.00),
('Small Box', 'Box', 'S', 30, 20, 15, 25.00),
('Medium Box', 'Box', 'M', 40, 30, 25, 40.00),
('Large Box', 'Box', 'L', 50, 40, 35, 60.00),
('Extra Large Box', 'Box', 'XL', 60, 50, 45, 90.00);

-- Insert sample provinces
INSERT INTO `Province` (`Name`, `Code`, `BasePrice`, `DeliveryDays`) VALUES
('Bangkok', 'BKK', 50.00, 1),
('Nonthaburi', 'NBI', 60.00, 2),
('Pathum Thani', 'PTE', 65.00, 2),
('Samut Prakan', 'SPK', 55.00, 2),
('Chiang Mai', 'CMI', 120.00, 3),
('Chiang Rai', 'CRI', 150.00, 4),
('Phuket', 'PKT', 180.00, 4),
('Khon Kaen', 'KKN', 100.00, 3),
('Nakhon Ratchasima', 'NMA', 110.00, 3),
('Ubon Ratchathani', 'UBO', 130.00, 4);

-- Insert sample province mappings (same province = local delivery)
-- Note: This will create mappings for all province combinations
-- For same province: local price, 1 day
INSERT IGNORE INTO `ProvinceMapping` (`OriginProvinceID`, `DestProvinceID`, `Price`, `DeliveryDays`)
SELECT ProvinceID, ProvinceID, BasePrice, 1
FROM Province;

-- Bangkok to others (predefined prices)
INSERT IGNORE INTO `ProvinceMapping` (`OriginProvinceID`, `DestProvinceID`, `Price`, `DeliveryDays`)
SELECT 
  (SELECT ProvinceID FROM Province WHERE Name = 'Bangkok') as OriginProvinceID,
  ProvinceID as DestProvinceID,
  CASE Name
    WHEN 'Bangkok' THEN 50.00
    WHEN 'Nonthaburi' THEN 60.00
    WHEN 'Pathum Thani' THEN 65.00
    WHEN 'Samut Prakan' THEN 55.00
    WHEN 'Chiang Mai' THEN 150.00
    WHEN 'Chiang Rai' THEN 180.00
    WHEN 'Phuket' THEN 200.00
    WHEN 'Khon Kaen' THEN 130.00
    WHEN 'Nakhon Ratchasima' THEN 140.00
    WHEN 'Ubon Ratchathani' THEN 160.00
    ELSE 100.00
  END as Price,
  CASE Name
    WHEN 'Bangkok' THEN 1
    WHEN 'Nonthaburi' THEN 1
    WHEN 'Pathum Thani' THEN 1
    WHEN 'Samut Prakan' THEN 1
    WHEN 'Chiang Mai' THEN 3
    WHEN 'Chiang Rai' THEN 4
    WHEN 'Phuket' THEN 4
    WHEN 'Khon Kaen' THEN 3
    WHEN 'Nakhon Ratchasima' THEN 3
    WHEN 'Ubon Ratchathani' THEN 4
    ELSE 3
  END as DeliveryDays
FROM Province
WHERE Name != 'Bangkok';

-- Generate remaining mappings for other province combinations
INSERT IGNORE INTO `ProvinceMapping` (`OriginProvinceID`, `DestProvinceID`, `Price`, `DeliveryDays`)
SELECT 
  p1.ProvinceID as OriginProvinceID,
  p2.ProvinceID as DestProvinceID,
  (p1.BasePrice + p2.BasePrice) / 2 + 
  CASE 
    WHEN p1.Name = p2.Name THEN 0
    WHEN p1.Name IN ('Bangkok', 'Nonthaburi', 'Pathum Thani', 'Samut Prakan') AND 
         p2.Name IN ('Bangkok', 'Nonthaburi', 'Pathum Thani', 'Samut Prakan') THEN 10
    ELSE 50
  END as Price,
  GREATEST(p1.DeliveryDays, p2.DeliveryDays) as DeliveryDays
FROM Province p1
CROSS JOIN Province p2
WHERE p1.ProvinceID != p2.ProvinceID;

-- Create warehouse locations and warehouses
-- Step 1: Insert warehouse locations first (using IGNORE to avoid duplicates)
INSERT IGNORE INTO `Location` (`Address`, `District`, `Subdistrict`, `Province`, `Country`)
VALUES 
  ('999 Warehouse Complex, Sukhumvit Road', 'Wattana', 'Khlong Toei Nuea', 'Bangkok', 'Thailand'),
  ('123 Industrial Park, Hang Dong Road', 'Hang Dong', 'Ban Wang', 'Chiang Mai', 'Thailand'),
  ('456 Logistics Park, Thepkasattri Road', 'Thalang', 'Thepkasattri', 'Phuket', 'Thailand'),
  ('789 Logistics Center, Mittraphap Road', 'Mueang Khon Kaen', 'Nai Mueang', 'Khon Kaen', 'Thailand'),
  ('321 Distribution Hub, Talat Road', 'Mueang Surat Thani', 'Wat Pradu', 'Surat Thani', 'Thailand');

-- Step 2: Create warehouses using the locations created above
INSERT INTO `Warehouse` (`Name`, `Code`, `LocationID`, `IsActive`)
SELECT 'Bangkok Central Warehouse', 'BKK-CW-01', LocationID, 1
FROM Location 
WHERE Address = '999 Warehouse Complex, Sukhumvit Road' 
  AND Province = 'Bangkok'
LIMIT 1;

INSERT INTO `Warehouse` (`Name`, `Code`, `LocationID`, `IsActive`)
SELECT 'Chiang Mai Distribution Center', 'CM-DC-01', LocationID, 1
FROM Location 
WHERE Address = '123 Industrial Park, Hang Dong Road'
  AND Province = 'Chiang Mai'
LIMIT 1;

INSERT INTO `Warehouse` (`Name`, `Code`, `LocationID`, `IsActive`)
SELECT 'Phuket Hub', 'PKT-HUB-01', LocationID, 1
FROM Location 
WHERE Address = '456 Logistics Park, Thepkasattri Road'
  AND Province = 'Phuket'
LIMIT 1;

INSERT INTO `Warehouse` (`Name`, `Code`, `LocationID`, `IsActive`)
SELECT 'Khon Kaen Warehouse', 'KKN-WH-01', LocationID, 1
FROM Location 
WHERE Address = '789 Logistics Center, Mittraphap Road'
  AND Province = 'Khon Kaen'
LIMIT 1;

INSERT INTO `Warehouse` (`Name`, `Code`, `LocationID`, `IsActive`)
SELECT 'Surat Thani Logistics Center', 'SUT-LC-01', LocationID, 1
FROM Location 
WHERE Address = '321 Distribution Hub, Talat Road'
  AND Province = 'Surat Thani'
LIMIT 1;

-- Insert sample banks
INSERT INTO `Bank` (`Name`, `Code`, `IsActive`) VALUES
('Bangkok Bank', 'BBL', TRUE),
('Kasikorn Bank', 'KBANK', TRUE),
('Siam Commercial Bank', 'SCB', TRUE),
('Krung Thai Bank', 'KTB', TRUE),
('Bank of Ayudhya', 'BAY', TRUE),
('TMB Bank', 'TMB', TRUE),
('Government Savings Bank', 'GSB', TRUE),
('Thanachart Bank', 'TNB', TRUE);

-- ============================================
-- DATABASE VIEWS
-- ============================================

-- View 1: Sender Parcels View - Complete parcel information for senders
CREATE OR REPLACE VIEW `v_sender_parcels` AS
SELECT 
  p.ParcelID,
  p.SenderID,
  p.TrackingNumber,
  p.receiverName,
  p.receiverPhone,
  p.Status,
  p.weight,
  p.dimension_x,
  p.dimension_y,
  p.dimension_z,
  p.Price,
  p.PackagePrice,
  p.itemType,
  p.EstDeliveryDate,
  p.CreatedAt,
  p.UpdatedAt,
  ol.Address as orgAddress,
  ol.District as orgDistrict,
  ol.Subdistrict as orgSubdistrict,
  ol.Province as orgProvince,
  ol.Country as orgCountry,
  dl.Address as destAddress,
  dl.District as destDistrict,
  dl.Subdistrict as destSubdistrict,
  dl.Province as destProvince,
  dl.Country as destCountry,
  pa.Status as assignmentStatus,
  pa.CarrierID,
  c.firstname as carrierFirstName,
  c.lastname as carrierLastName,
  pt.Name as packageName,
  pt.Size as packageSize
FROM Parcel p
LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
LEFT JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
LEFT JOIN Carrier c ON pa.CarrierID = c.CarrierID
LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID;

-- View 2: Available Parcels for Carriers View
CREATE OR REPLACE VIEW `v_available_parcels_carrier` AS
SELECT 
  p.*,
  pa.AssignmentID,
  pa.Status as assignmentStatus,
  ol.Address as orgAddress,
  ol.District as orgDistrict,
  ol.Province as orgProvince,
  dl.Address as destAddress,
  dl.District as destDistrict,
  dl.Province as destProvince,
  u.firstname as senderFirstName,
  u.lastname as senderLastName,
  pt.Name as packageName,
  pt.Type as packageType,
  pt.Size as packageSize,
  pt.dimension_x as packageDimensionX,
  pt.dimension_y as packageDimensionY,
  pt.dimension_z as packageDimensionZ
FROM Parcel p
INNER JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
LEFT JOIN User u ON p.SenderID = u.UserID
LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
WHERE p.Status = 'Pending' AND pa.Status = 'Pending';

-- View 3: Carrier Assigned Parcels View
CREATE OR REPLACE VIEW `v_carrier_assigned_parcels` AS
SELECT 
  p.*,
  pa.AssignmentID,
  pa.Status as assignmentStatus,
  ol.Address as orgAddress,
  ol.District as orgDistrict,
  ol.Province as orgProvince,
  dl.Address as destAddress,
  dl.District as destDistrict,
  dl.Province as destProvince,
  u.firstname as senderFirstName,
  u.lastname as senderLastName,
  pt.Name as packageName,
  pt.Size as packageSize,
  pt.dimension_x as packageDimensionX,
  pt.dimension_y as packageDimensionY,
  pt.dimension_z as packageDimensionZ
FROM Parcel p
INNER JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
LEFT JOIN User u ON p.SenderID = u.UserID
LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID
WHERE pa.Status = 'Accepted';

-- View 4: Parcel Details View - Complete parcel information with all relations
CREATE OR REPLACE VIEW `v_parcel_details` AS
SELECT 
  p.*,
  ol.Address as orgAddress,
  ol.District as orgDistrict,
  ol.Subdistrict as orgSubdistrict,
  ol.Province as orgProvince,
  ol.Country as orgCountry,
  dl.Address as destAddress,
  dl.District as destDistrict,
  dl.Subdistrict as destSubdistrict,
  dl.Province as destProvince,
  dl.Country as destCountry,
  pa.Status as assignmentStatus,
  pa.CarrierID,
  c.firstname as carrierFirstName,
  c.lastname as carrierLastName,
  pt.Name as packageName,
  pt.Type as packageType,
  pt.Size as packageSize,
  pt.dimension_x as packageDimensionX,
  pt.dimension_y as packageDimensionY,
  pt.dimension_z as packageDimensionZ,
  pt.Price as packageTypePrice
FROM Parcel p
LEFT JOIN ParcelLocation pol ON p.ParcelID = pol.ParcelID AND pol.LocationType = 'Origin'
LEFT JOIN Location ol ON pol.LocationID = ol.LocationID
LEFT JOIN ParcelLocation pdl ON p.ParcelID = pdl.ParcelID AND pdl.LocationType = 'Destination'
LEFT JOIN Location dl ON pdl.LocationID = dl.LocationID
LEFT JOIN ParcelAssignment pa ON p.ParcelID = pa.ParcelID
LEFT JOIN Carrier c ON pa.CarrierID = c.CarrierID
LEFT JOIN PackageType pt ON p.SelectedPackageID = pt.PackageTypeID;

-- View 5: Shipment Events with Location View
CREATE OR REPLACE VIEW `v_shipment_events_location` AS
SELECT 
  se.EventID,
  se.ParcelID,
  se.EventType,
  se.Status,
  se.Description,
  se.EventTime,
  se.LocationID,
  l.Address,
  l.District,
  l.Subdistrict,
  l.Province,
  l.Country,
  p.TrackingNumber
FROM ShipmentEvent se
LEFT JOIN Location l ON se.LocationID = l.LocationID
LEFT JOIN Parcel p ON se.ParcelID = p.ParcelID;

-- View 6: Route Stops with Warehouse View
CREATE OR REPLACE VIEW `v_route_stops_warehouse` AS
SELECT 
  rs.StopID,
  rs.RouteID,
  rs.ParcelID,
  rs.Sequence,
  rs.ETA,
  rs.AAT,
  rs.StopStatus,
  rs.LocationID,
  rs.WarehouseID,
  l.Address,
  l.District,
  l.Subdistrict,
  l.Province,
  l.Country,
  w.Name as WarehouseName,
  w.Code as WarehouseCode,
  r.Status as RouteStatus,
  p.TrackingNumber
FROM RouteStop rs
INNER JOIN Location l ON rs.LocationID = l.LocationID
LEFT JOIN Warehouse w ON rs.WarehouseID = w.WarehouseID
INNER JOIN Route r ON rs.RouteID = r.RouteID
LEFT JOIN Parcel p ON rs.ParcelID = p.ParcelID;

-- View 7: User Locations View - Complete user address information
CREATE OR REPLACE VIEW `v_user_locations` AS
SELECT 
  ul.UserLocationID,
  ul.UserID,
  ul.LocationID,
  ul.Name as LocationName,
  ul.CreatedAt,
  ul.UpdatedAt,
  l.Address,
  l.District,
  l.Subdistrict,
  l.Province,
  l.Country,
  u.firstname,
  u.lastname,
  u.email
FROM UserLocation ul
INNER JOIN Location l ON ul.LocationID = l.LocationID
INNER JOIN User u ON ul.UserID = u.UserID;

-- View 8: Notifications with Parcel View
CREATE OR REPLACE VIEW `v_notifications_parcel` AS
SELECT 
  n.NotificationID,
  n.UserID,
  n.Type,
  n.Title,
  n.Message,
  n.IsRead,
  n.ParcelID,
  n.CreatedAt,
  p.TrackingNumber,
  p.Status as ParcelStatus,
  u.firstname,
  u.lastname,
  u.email
FROM Notification n
LEFT JOIN Parcel p ON n.ParcelID = p.ParcelID
LEFT JOIN User u ON n.UserID = u.UserID;

-- View 9: Active Warehouses with Location View
CREATE OR REPLACE VIEW `v_active_warehouses` AS
SELECT 
  w.WarehouseID,
  w.Name as WarehouseName,
  w.Code as WarehouseCode,
  w.LocationID,
  w.IsActive,
  w.CreatedAt,
  w.UpdatedAt,
  l.Address,
  l.District,
  l.Subdistrict,
  l.Province,
  l.Country
FROM Warehouse w
INNER JOIN Location l ON w.LocationID = l.LocationID
WHERE w.IsActive = TRUE;

-- View 10: Transaction History with Bank View
CREATE OR REPLACE VIEW `v_transaction_history` AS
SELECT 
  t.TransactionID,
  t.UserID,
  t.BankID,
  t.Type,
  t.Amount,
  t.Status,
  t.Reference,
  t.Description,
  t.CreatedAt,
  b.Name as BankName,
  b.Code as BankCode,
  u.firstname,
  u.lastname,
  u.email
FROM Transaction t
LEFT JOIN Bank b ON t.BankID = b.BankID
LEFT JOIN User u ON t.UserID = u.UserID;

-- View 11: User Balance Summary View
CREATE OR REPLACE VIEW `v_user_balance_summary` AS
SELECT 
  u.UserID,
  u.firstname,
  u.lastname,
  u.email,
  u.balance,
  COUNT(DISTINCT p.ParcelID) as totalParcels,
  SUM(CASE WHEN t.Type = 'Topup' THEN t.Amount ELSE 0 END) as totalTopup,
  SUM(CASE WHEN t.Type = 'Parcel' THEN t.Amount ELSE 0 END) as totalSpent,
  COUNT(DISTINCT CASE WHEN t.Type = 'Topup' THEN t.TransactionID END) as topupCount,
  COUNT(DISTINCT CASE WHEN t.Type = 'Parcel' THEN t.TransactionID END) as parcelPaymentCount
FROM User u
LEFT JOIN Parcel p ON u.UserID = p.SenderID
LEFT JOIN Transaction t ON u.UserID = t.UserID AND t.Status = 'Completed'
GROUP BY u.UserID, u.firstname, u.lastname, u.email, u.balance;

-- View 12: Parcel Statistics by Status View
CREATE OR REPLACE VIEW `v_parcel_statistics` AS
SELECT 
  Status,
  COUNT(*) as parcelCount,
  SUM(Price) as totalRevenue,
  AVG(Price) as avgPrice,
  SUM(PackagePrice) as totalPackageRevenue,
  SUM(CASE WHEN weight IS NOT NULL THEN 1 ELSE 0 END) as measuredCount,
  MIN(CreatedAt) as firstParcel,
  MAX(CreatedAt) as lastParcel
FROM Parcel
GROUP BY Status;

-- View 13: Route Progress View
CREATE OR REPLACE VIEW `v_route_progress` AS
SELECT 
  r.RouteID,
  r.ParcelID,
  r.Status as RouteStatus,
  r.RouteDate,
  r.CreatedAt,
  p.TrackingNumber,
  p.Status as ParcelStatus,
  COUNT(rs.StopID) as totalStops,
  COUNT(CASE WHEN rs.StopStatus IN ('Completed', 'Late') THEN 1 END) as completedStops,
  COUNT(CASE WHEN rs.StopStatus = 'Pending' THEN 1 END) as pendingStops,
  MIN(rs.ETA) as firstStopETA,
  MAX(CASE WHEN rs.StopStatus IN ('Completed', 'Late') THEN rs.AAT END) as lastStopAAT
FROM Route r
INNER JOIN Parcel p ON r.ParcelID = p.ParcelID
LEFT JOIN RouteStop rs ON r.RouteID = rs.RouteID
GROUP BY r.RouteID, r.ParcelID, r.Status, r.RouteDate, r.CreatedAt, p.TrackingNumber, p.Status;

-- View 14: Province Mapping with Names View
CREATE OR REPLACE VIEW `v_province_mapping_details` AS
SELECT 
  pm.MappingID,
  pm.OriginProvinceID,
  pm.DestProvinceID,
  pm.Price,
  pm.DeliveryDays,
  po.Name as OriginProvinceName,
  po.BasePrice as OriginBasePrice,
  pd.Name as DestProvinceName,
  pd.BasePrice as DestBasePrice
FROM ProvinceMapping pm
INNER JOIN Province po ON pm.OriginProvinceID = po.ProvinceID
INNER JOIN Province pd ON pm.DestProvinceID = pd.ProvinceID;

-- View 15: Active Carriers View
CREATE OR REPLACE VIEW `v_active_carriers` AS
SELECT 
  c.CarrierID,
  c.firstname,
  c.lastname,
  c.phone,
  c.email,
  c.vehInfo,
  c.vehLicense,
  c.EmploymentType,
  c.isAvailable,
  c.CreatedAt,
  c.UpdatedAt,
  COUNT(DISTINCT pa.ParcelID) as assignedParcels,
  COUNT(DISTINCT CASE WHEN pa.Status = 'Accepted' THEN pa.ParcelID END) as activeParcels
FROM Carrier c
LEFT JOIN ParcelAssignment pa ON c.CarrierID = pa.CarrierID
WHERE c.isAvailable = TRUE
GROUP BY c.CarrierID, c.firstname, c.lastname, c.phone, c.email, c.vehInfo, c.vehLicense, c.EmploymentType, c.isAvailable, c.CreatedAt, c.UpdatedAt;

