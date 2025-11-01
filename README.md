# Parcel Delivery Platform

A comprehensive online parcel delivery platform built with React.js, TailwindCSS, Node.js, Express, and MySQL. The platform supports both sender and carrier functionalities with a mobile-first design.

## Features

### For Senders:
- User registration and login
- Address management (required before creating parcels)
- Create parcels with tracking numbers
- Notify carriers about available parcels
- Track parcels in real-time with delivery timeline
- View shipment history
- Receive notifications for parcel status updates

### For Carriers:
- Carrier registration and login
- View available parcel assignments
- Accept parcel assignments
- Update parcel delivery status
- View assigned parcels
- Receive notifications for new parcel assignments

## Tech Stack

### Frontend:
- React.js 18
- TailwindCSS
- React Router DOM
- Axios
- Vite (Build tool)

### Backend:
- Node.js
- Express.js
- MySQL2
- JWT Authentication
- bcryptjs
- Express Validator

## Project Structure

```
dbproj/
├── backend/
│   ├── config/
│   │   ├── database.js      # MySQL connection pool
│   │   └── db.sql            # Database schema
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── parcels.js        # Parcel management routes
│   │   ├── addresses.js      # Address management routes
│   │   ├── carriers.js       # Carrier-specific routes
│   │   └── notifications.js # Notification routes
│   ├── server.js             # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React context providers
│   │   ├── pages/           # Page components
│   │   │   ├── sender/      # Sender-specific pages
│   │   │   └── carrier/    # Carrier-specific pages
│   │   ├── services/       # API service functions
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx        # Entry point
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Database Setup

#### Option 1: Using Docker (Recommended)

1. Start MySQL and phpMyAdmin with Docker:
```bash
docker-compose up -d
```

2. The database will be automatically initialized with all tables.

3. Access phpMyAdmin at `http://localhost:8080`:
   - Server: `mysql`
   - Username: `root`
   - Password: `rootpassword`

4. See `DOCKER_SETUP.md` for detailed Docker instructions.

#### Option 2: Local MySQL Installation

1. Create MySQL database:
```sql
CREATE DATABASE parcel_delivery;
```

2. Run the SQL schema file:
```bash
mysql -u root -p parcel_delivery < backend/config/db.sql
```

Or import the SQL file through your MySQL client (phpMyAdmin, MySQL Workbench, etc.)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in backend directory:

For Docker setup:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=rootpassword
DB_NAME=parcel_delivery
JWT_SECRET=your_secret_key_here_change_this_in_production
```

For local MySQL:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=parcel_delivery
JWT_SECRET=your_secret_key_here_change_this_in_production
```

4. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

### First Time Setup

1. **Register as Sender:**
   - Go to `/login`
   - Switch to "Register" tab
   - Fill in your details (email, phone, firstname, lastname, password)
   - After registration, you'll be logged in

2. **Add Address (Required):**
   - Navigate to Account tab (bottom navigation)
   - Click "Add" to add your address
   - Fill in address details (Street, District, Subdistrict, Province, Country)
   - Save the address

3. **Create a Parcel:**
   - Go to Create tab (bottom navigation)
   - Fill in parcel details:
     - Receiver name and phone
     - Weight and dimensions
     - Origin and destination locations
   - Click "Create Parcel"

4. **Notify Carriers:**
   - After creating a parcel, view its details
   - Click "Notify Carriers" button
   - Available carriers will receive notifications

### For Carriers

1. **Register as Carrier:**
   - Go to `/carrier/login`
   - Switch to "Register" tab
   - Fill in carrier details (including vehicle information)
   - After registration, you'll be logged in

2. **Accept Parcels:**
   - View available parcels in "Available" tab
   - Click "Accept" to take on a delivery job
   - You'll see the parcel in "My Parcels" tab

3. **Update Delivery Status:**
   - View parcel details
   - Use the status update form to track delivery progress
   - Add events like "Parcel Picked", "In Transit", "Delivered", etc.

## API Endpoints

### Authentication
- `POST /api/auth/sender/register` - Register sender
- `POST /api/auth/sender/login` - Login sender
- `POST /api/auth/carrier/register` - Register carrier
- `POST /api/auth/carrier/login` - Login carrier

### Parcels
- `POST /api/parcels` - Create parcel (sender only)
- `GET /api/parcels/sender` - Get sender's parcels
- `GET /api/parcels/:parcelID` - Get parcel by ID
- `GET /api/parcels/track/:trackingNumber` - Track parcel by tracking number
- `POST /api/parcels/:parcelID/notify` - Notify carriers (sender only)

### Addresses
- `POST /api/addresses` - Create address
- `GET /api/addresses/me` - Get user's address
- `PUT /api/addresses/me` - Update address
- `GET /api/addresses/locations` - Get all locations

### Carriers
- `GET /api/carriers/available-parcels` - Get available parcels
- `POST /api/carriers/accept-parcel/:parcelID` - Accept parcel assignment
- `GET /api/carriers/my-parcels` - Get carrier's assigned parcels
- `POST /api/carriers/update-status/:parcelID` - Update parcel status

### Notifications
- `GET /api/notifications/sender` - Get sender notifications
- `GET /api/notifications/carrier` - Get carrier notifications
- `PUT /api/notifications/:notificationID/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

## Design Features

- **Mobile-First Design:** The application is optimized for mobile devices and will render in mobile view even on desktop/tablet
- **Modern UI:** Clean, intuitive interface with red and white color scheme
- **Real-time Tracking:** Timeline visualization of parcel delivery status
- **Notification System:** Real-time notifications for both senders and carriers
- **Bottom Navigation:** Mobile app-style navigation bar

## Notes

- All routes require JWT authentication except login/register endpoints
- The application uses JWT tokens stored in localStorage
- Passwords are hashed using bcrypt
- The database schema includes proper foreign key relationships
- Location data includes support for GPS coordinates (latitude/longitude)

## Development

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

### Database Schema

The database includes the following main tables:
- `User` - Sender information
- `Carrier` - Carrier information
- `Parcel` - Parcel details
- `Location` - Address/location data
- `ParcelAssignment` - Carrier-parcel assignments
- `ShipmentEvent` - Delivery timeline events
- `Notification` - User notifications
- `Route` and `RouteStop` - Advanced routing features (for future use)

## License

This project is for educational purposes.

