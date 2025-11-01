# Docker Setup Guide

This guide will help you set up MySQL and phpMyAdmin using Docker Compose for the Parcel Delivery Platform.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

1. **Start the containers:**
   ```bash
   docker-compose up -d
   ```

2. **Verify containers are running:**
   ```bash
   docker-compose ps
   ```

3. **Access phpMyAdmin:**
   - Open your browser and go to: `http://localhost:8080`
   - Login credentials:
     - Server: `mysql`
     - Username: `root`
     - Password: `rootpassword`

4. **Connect to MySQL from your backend:**
   - Update your `.env` file in the `backend` directory:
     ```
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=rootpassword
     DB_NAME=parcel_delivery
     JWT_SECRET=your_secret_key_here
     ```

## Database Setup

The database will be automatically initialized when you first start the MySQL container. The `init-db.sql` file will be executed automatically, creating all necessary tables.

### Manual Database Verification

You can verify the database was created correctly:

1. **Using phpMyAdmin:**
   - Login to phpMyAdmin at `http://localhost:8080`
   - Select `parcel_delivery` from the left sidebar
   - You should see all the tables (User, Carrier, Parcel, Location, etc.)

2. **Using MySQL command line:**
   ```bash
   docker exec -it parcel_delivery_mysql mysql -u root -prootpassword parcel_delivery -e "SHOW TABLES;"
   ```

## Container Management

### Stop containers:
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ This will delete all data):
```bash
docker-compose down -v
```

### View logs:
```bash
docker-compose logs -f
```

### View MySQL logs only:
```bash
docker-compose logs -f mysql
```

### Restart containers:
```bash
docker-compose restart
```

## Database Credentials

- **Root Password:** `rootpassword`
- **Database Name:** `parcel_delivery`
- **Database User:** `parcel_user`
- **Database User Password:** `parcel_password`
- **Port:** `3306`

## Connection Strings

### From Backend (Node.js):
```
Host: localhost
Port: 3306
User: root
Password: rootpassword
Database: parcel_delivery
```

### From phpMyAdmin:
```
Server: mysql
Username: root
Password: rootpassword
```

## Troubleshooting

### Container won't start
- Check if port 3306 or 8080 is already in use
- Run `docker-compose logs mysql` to see error messages

### Database not initialized
- Make sure `init-db.sql` file exists in `backend/config/`
- Remove volumes and restart: `docker-compose down -v && docker-compose up -d`

### Connection refused
- Wait a few seconds after starting containers (MySQL needs time to initialize)
- Check if containers are running: `docker-compose ps`
- Verify MySQL is healthy: `docker-compose exec mysql mysqladmin ping -h localhost -u root -prootpassword`

### Reset database
```bash
docker-compose down -v
docker-compose up -d
```

This will delete all data and recreate the database with fresh tables.

## Persistent Data

All database data is stored in a Docker volume (`mysql_data`) and will persist even if you stop the containers. To completely remove all data:

```bash
docker-compose down -v
```

## Security Note

⚠️ **Important:** The default passwords in this setup are for development only. For production:

1. Change all passwords in `docker-compose.yml`
2. Use environment variables for sensitive data
3. Restrict database access
4. Use strong passwords

## Next Steps

After the database is set up:

1. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Your application should now be able to connect to the MySQL database!

