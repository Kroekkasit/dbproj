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
  p.SelectedPackageID,
  p.EstDeliveryDate,
  p.CreatedAt,
  p.UpdatedAt,
  pa.AssignmentID,
  pa.CarrierID,
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
  n.CarrierID,
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
