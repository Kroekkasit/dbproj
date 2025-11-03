# Delivery Plans and Optional Services Implementation Plan

## Overview
This document outlines the plan to implement:
1. **Delivery Plans**: Fast Delivery (with fee) and Standard Delivery
2. **Optional Services**: Care+ insurance service

---

## 1. Database Schema Changes

### 1.1 Create DeliveryPlan Table
```sql
CREATE TABLE IF NOT EXISTS `DeliveryPlan` (
  `PlanID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(50) NOT NULL UNIQUE, -- 'Standard', 'Fast'
  `Description` TEXT,
  `FastDeliveryFee` DECIMAL(10, 2) DEFAULT 0.00, -- Additional fee for fast delivery (0 for standard)
  `DeliveryDaysReduction` INT DEFAULT 0, -- Days to reduce from standard delivery (0 for standard, 1-2 for fast)
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Create OptionalService Table
```sql
CREATE TABLE IF NOT EXISTS `OptionalService` (
  `ServiceID` INT AUTO_INCREMENT PRIMARY KEY,
  `Name` VARCHAR(100) NOT NULL UNIQUE, -- 'Care+'
  `Description` TEXT,
  `ServiceFee` DECIMAL(10, 2) NOT NULL, -- Fee for this service
  `CoverageAmount` DECIMAL(10, 2), -- Maximum coverage amount (for insurance)
  `IsActive` BOOLEAN DEFAULT TRUE,
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Update Parcel Table
Add columns to track selected plan and services:
```sql
ALTER TABLE `Parcel` ADD COLUMN `DeliveryPlanID` INT DEFAULT NULL AFTER `PackagePrice`;
ALTER TABLE `Parcel` ADD COLUMN `FastDeliveryFee` DECIMAL(10, 2) DEFAULT 0.00 AFTER `DeliveryPlanID`;
ALTER TABLE `Parcel` ADD COLUMN `ServiceFee` DECIMAL(10, 2) DEFAULT 0.00 AFTER `FastDeliveryFee`;

ALTER TABLE `Parcel` 
  ADD FOREIGN KEY (`DeliveryPlanID`) REFERENCES `DeliveryPlan` (`PlanID`) ON DELETE SET NULL;
```

### 1.4 Create ParcelService Table (Many-to-Many)
```sql
CREATE TABLE IF NOT EXISTS `ParcelService` (
  `ParcelServiceID` INT AUTO_INCREMENT PRIMARY KEY,
  `ParcelID` INT NOT NULL,
  `ServiceID` INT NOT NULL,
  `ServiceFee` DECIMAL(10, 2) NOT NULL, -- Store fee at time of purchase
  `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ParcelID`) REFERENCES `Parcel` (`ParcelID`) ON DELETE CASCADE,
  FOREIGN KEY (`ServiceID`) REFERENCES `OptionalService` (`ServiceID`) ON DELETE CASCADE,
  UNIQUE KEY `unique_parcel_service` (`ParcelID`, `ServiceID`)
);
```

---

## 2. Initial Data Setup

### 2.1 Insert Delivery Plans
```sql
INSERT INTO `DeliveryPlan` (`Name`, `Description`, `FastDeliveryFee`, `DeliveryDaysReduction`) VALUES
('Standard', 'Standard delivery service', 0.00, 0),
('Fast', 'Express delivery service with priority handling', 50.00, 1);
```

### 2.2 Insert Optional Services
```sql
INSERT INTO `OptionalService` (`Name`, `Description`, `ServiceFee`, `CoverageAmount`) VALUES
('Care+', 'Package insurance coverage for lost or damaged items', 25.00, 5000.00);
```

---

## 3. Backend Changes

### 3.1 Update `backend/utils/calculations.js`

**New Function: `calculatePriceWithPlan`**
- Takes delivery plan as parameter
- Calculates base price (existing logic)
- Adds fast delivery fee if plan is "Fast"
- Returns: `{ basePrice, fastDeliveryFee, totalPrice }`

**New Function: `calculateDeliveryDateWithPlan`**
- Takes delivery plan as parameter
- Calculates base delivery days (existing logic)
- Reduces days if plan is "Fast"
- Returns delivery date

**New Function: `calculateServiceFees`**
- Takes array of selected service IDs
- Sums up all service fees
- Returns total service fee

### 3.2 Update `backend/routes/parcels.js`

**Update `/calculate` endpoint:**
- Accept `deliveryPlanID` (optional, defaults to Standard)
- Accept `selectedServiceIDs` (optional array)
- Calculate price with plan and services
- Return breakdown: `{ basePrice, fastDeliveryFee, serviceFee, totalPrice }`

**Update `/create` endpoint:**
- Accept `deliveryPlanID` (optional, defaults to Standard)
- Accept `selectedServiceIDs` (optional array)
- Store plan and services in database
- Calculate and store fees
- Update price calculation to include fees

### 3.3 Create `backend/routes/delivery-plans.js` (New)
- `GET /` - Get all active delivery plans
- `GET /:planID` - Get specific plan details

### 3.4 Create `backend/routes/optional-services.js` (New)
- `GET /` - Get all active optional services
- `GET /:serviceID` - Get specific service details

### 3.5 Update `backend/routes/carriers.js`

**Update `submit-measurements` endpoint:**
- Include fast delivery fee and service fees in final price calculation
- Update delivery date based on selected plan

---

## 4. Frontend Changes

### 4.1 Update `frontend/src/services/api.js`
- Add `deliveryPlansAPI` with get methods
- Add `optionalServicesAPI` with get methods

### 4.2 Update `frontend/src/pages/sender/SenderCreateParcel.jsx`

**Add State:**
- `deliveryPlans` - Available plans
- `selectedPlan` - Currently selected plan (default: Standard)
- `optionalServices` - Available services
- `selectedServices` - Array of selected service IDs
- `priceBreakdown` - Updated to show: basePrice, fastDeliveryFee, serviceFee, totalPrice

**Add UI Components:**
1. **Delivery Plan Selection:**
   - Radio buttons or cards for Standard/Fast
   - Show description and fee
   - Update price when changed

2. **Optional Services Section:**
   - Checkboxes for each service (e.g., Care+)
   - Show description, fee, and coverage (for insurance)
   - Update price when toggled

3. **Enhanced Price Breakdown:**
   - Package Price
   - Base Delivery Price
   - Fast Delivery Fee (if selected)
   - Service Fees (if selected)
   - Total Price

### 4.3 Update `frontend/src/pages/carrier/CarrierParcelDetails.jsx`
- Display delivery plan used
- Display selected services
- Show breakdown of fees in price display

---

## 5. Price Calculation Flow

### Standard Delivery:
```
Total = PackagePrice + BaseDeliveryPrice + ServiceFees
```

### Fast Delivery:
```
Total = PackagePrice + BaseDeliveryPrice + FastDeliveryFee + ServiceFees
```

### Delivery Date Calculation:
- **Standard**: Base delivery days from ProvinceMapping
- **Fast**: Base delivery days - DeliveryDaysReduction

---

## 6. Implementation Order

1. ✅ Create database migration script
2. ✅ Update database schema (tables and columns)
3. ✅ Insert initial data (plans and services)
4. ✅ Update `calculations.js` with new functions
5. ✅ Create new API routes for plans and services
6. ✅ Update `/parcels/calculate` endpoint
7. ✅ Update `/parcels/create` endpoint
8. ✅ Update frontend API service
9. ✅ Update `SenderCreateParcel.jsx` UI
10. ✅ Update carrier views to show plan/services
11. ✅ Test complete flow

---

## 7. Example API Responses

### GET /api/delivery-plans
```json
{
  "plans": [
    {
      "PlanID": 1,
      "Name": "Standard",
      "Description": "Standard delivery service",
      "FastDeliveryFee": 0.00,
      "DeliveryDaysReduction": 0
    },
    {
      "PlanID": 2,
      "Name": "Fast",
      "Description": "Express delivery service",
      "FastDeliveryFee": 50.00,
      "DeliveryDaysReduction": 1
    }
  ]
}
```

### GET /api/optional-services
```json
{
  "services": [
    {
      "ServiceID": 1,
      "Name": "Care+",
      "Description": "Package insurance coverage",
      "ServiceFee": 25.00,
      "CoverageAmount": 5000.00
    }
  ]
}
```

### POST /api/parcels/calculate (Updated)
Request:
```json
{
  "orgLocationID": 1,
  "destProvince": "Chiang Mai",
  "SelectedPackageID": 2,
  "useOwnPackage": false,
  "weight": 2.5,
  "dimension_x": 30,
  "dimension_y": 20,
  "dimension_z": 15,
  "deliveryPlanID": 2,
  "selectedServiceIDs": [1]
}
```

Response:
```json
{
  "packagePrice": 25.00,
  "baseDeliveryPrice": 150.00,
  "fastDeliveryFee": 50.00,
  "serviceFee": 25.00,
  "totalPrice": 250.00,
  "estimatedDeliveryDate": "2025-01-05T10:00:00Z",
  "deliveryPlan": {
    "PlanID": 2,
    "Name": "Fast",
    "DeliveryDaysReduction": 1
  },
  "selectedServices": [
    {
      "ServiceID": 1,
      "Name": "Care+",
      "ServiceFee": 25.00
    }
  ]
}
```

---

## 8. Database Migration Script

Will be created as: `backend/config/migration_delivery_plans_services.sql`

---

## 9. Testing Checklist

- [ ] Standard delivery without services
- [ ] Fast delivery without services
- [ ] Standard delivery with Care+ service
- [ ] Fast delivery with Care+ service
- [ ] Price calculation updates when plan changes
- [ ] Price calculation updates when services toggle
- [ ] Delivery date reflects selected plan
- [ ] Parcel creation saves plan and services
- [ ] Carrier can see plan and services on parcel details
- [ ] Price breakdown displays correctly on all views

---

## Notes

- Fast delivery fee is fixed (not percentage-based)
- Service fees are additive (can select multiple services in future)
- Delivery plan can be changed before final submission
- Services can be toggled on/off before final submission
- All fees are stored at parcel creation time (prices don't change retroactively)

