-- Rollback script to remove bag system changes
-- This removes Bag, BagParcel tables and Carrier modifications

USE parcel_delivery;

-- Step 1: Drop foreign key constraints that reference Bag/BagParcel
-- Drop BagParcel foreign keys first
ALTER TABLE BagParcel DROP FOREIGN KEY BagParcel_ibfk_1;  -- References Bag
ALTER TABLE BagParcel DROP FOREIGN KEY BagParcel_ibfk_2;  -- References Parcel

-- Step 2: Drop Bag table foreign keys (that reference Carrier and Warehouse)
ALTER TABLE Bag DROP FOREIGN KEY Bag_ibfk_1;  -- References Carrier
ALTER TABLE Bag DROP FOREIGN KEY Bag_ibfk_2;  -- References Warehouse (CurrentWarehouseID)
ALTER TABLE Bag DROP FOREIGN KEY Bag_ibfk_3;  -- References Warehouse (SourceWarehouseID)
ALTER TABLE Bag DROP FOREIGN KEY Bag_ibfk_4;  -- References Warehouse (DestinationWarehouseID)

-- Step 3: Drop the Bag and BagParcel tables
DROP TABLE IF EXISTS BagParcel;
DROP TABLE IF EXISTS Bag;

-- Step 4: Remove WarehouseID foreign key from Carrier
ALTER TABLE Carrier DROP FOREIGN KEY Carrier_ibfk_1;

-- Step 5: Remove WarehouseID column from Carrier
ALTER TABLE Carrier DROP COLUMN WarehouseID;

-- Step 6: Remove CarrierType column from Carrier
ALTER TABLE Carrier DROP COLUMN CarrierType;

-- Note: Warehouse table is left intact as it may have been part of the original schema
-- If you want to remove it, uncomment the following lines:
-- DROP TABLE IF EXISTS Warehouse;

