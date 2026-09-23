# Flight Booking Service

A backend service for managing flight-related operations using **Node.js, Express.js, Sequelize, and MySQL**.

The project follows a clean and modular backend architecture, separating API routes, controllers, business logic, database operations, configuration, and utility functions.

## Project Structure

The main source code is inside the `src` folder.

```text
src/
├── config/
├── controllers/
├── middlewares/
├── repositories/
├── routes/
├── services/
└── utils/
```

### `config`

Contains configuration and setup for libraries and application-level services.

For example:

* Environment variable configuration using `dotenv`
* Database configuration
* Logger configuration
* Other application-level setup

### `routes`

Contains API routes and connects them with the required middleware and controllers.

### `middlewares`

Contains middleware functions that process incoming requests before they reach the controllers.

Examples include:

* Request validation
* Authentication
* Authorization
* Error handling

### `controllers`

Controllers handle incoming HTTP requests and prepare API responses.

They:

1. Receive request data
2. Validate or extract required information
3. Call the appropriate service
4. Receive the result from the service
5. Send the API response

### `services`

Contains the main business logic of the application.

Services process application-specific operations and communicate with repositories whenever database access is required.

### `repositories`

Contains database-related operations.

This layer is responsible for interacting with the database using Sequelize ORM queries or other database queries.

### `utils`

Contains reusable helper functions and common utilities such as:

* Custom error classes
* Helper methods
* Common functions used across the application

---

## Architecture

The project follows a layered backend architecture:

```text
Client
   ↓
Routes
   ↓
Middlewares
   ↓
Controllers
   ↓
Services
   ↓
Repositories
   ↓
Database
```

This separation keeps the code modular, maintainable, and easier to extend.

---

## Setup the Project

### 1. Clone the repository

```bash
git clone https://github.com/atulrana0209/Flight-Booking-Service.git
cd Flight-Booking-Service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
PORT=3000
```

Add other required database or application environment variables as needed.

### 4. Configure Sequelize

Go inside the `src` directory:

```bash
cd src
```

Initialize Sequelize:

```bash
npx sequelize init
```

This will create the required Sequelize folders and configuration files.

Configure your database credentials in the Sequelize configuration.

For example:

```json
{
  "development": {
    "username": "your_username",
    "password": "your_password",
    "database": "your_database",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
```

For production or testing environments, use the appropriate database credentials and hosted database URL.

### 5. Run the application

From the project root directory, run:

```bash
npm run dev
```

The server will start on the port specified in your `.env` file.

For example:

```text
http://localhost:3000
```

---

## Technologies Used

* **Node.js**
* **Express.js**
* **JavaScript**
* **MySQL**
* **Sequelize**
* **REST APIs**
* **dotenv**
* **Git & GitHub**

## License

This project is intended for learning and development purposes.
