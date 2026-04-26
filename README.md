✈️ Flight Booking Service

A production-grade backend service for managing flight search and booking operations, built with scalable architecture, clean code practices, and real-world system design principles.

🚀 Tech Stack
Runtime: Node.js
Framework: Express.js
ORM: Sequelize
Database: MySQL / MariaDB
Environment Management: dotenv
🎯 Problem Statement

Modern flight booking systems require:

High availability under concurrent requests
Clean separation of business logic
Scalable and maintainable architecture
Efficient database interaction

This project is designed as a foundation of a real-world airline reservation system, focusing on backend robustness and extensibility.

🏗️ System Architecture
🔁 High-Level Flow

<img width="393" height="1142" alt="mermaid-diagram" src="https://github.com/user-attachments/assets/f86181ab-0a56-49b3-b3d2-23d5f9ca67f5" />

🧠 Architectural Decisions

1. Layered Architecture (Separation of Concerns)

Controllers handle HTTP logic only
Services contain business rules
Repositories manage database queries

👉 This avoids tight coupling and makes the system testable and scalable.

2. Repository Pattern
Abstracts database operations from business logic.

Why it matters:

Easy DB migration (MySQL → PostgreSQL)
Cleaner unit testing (mock repositories)

3. ORM over Raw Queries (Sequelize)

Faster development
Built-in validation & migrations
Reduced SQL boilerplate

Trade-off:

Slight performance overhead vs raw SQL (acceptable at this scale)

📁 Project Structure
src/
 ├── config/         # DB & environment configuration
 ├── routes/         # API route definitions
 ├── controllers/    # Request-response handling
 ├── services/       # Business logic layer
 ├── repositories/   # Database access layer
 ├── middlewares/    # Validation, authentication (extensible)
 ├── utils/          # Error handling & helpers


 🔄 Request Lifecycle (Detailed)
 <img width="2500" height="1170" alt="mermaid-diagram (1)" src="https://github.com/user-attachments/assets/5ec2a4f7-d9f2-4675-9e11-47dee7848ece" />

⚙️ Getting Started
1. Clone Repository
git clone https://github.com/atulrana0209/Flight-Booking-Service.git
cd Flight-Booking-Service
2. Install Dependencies
npm install
3. Environment Setup

Create a .env file:

PORT=3000

DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=flight_booking_db
4. Initialize Sequelize
npx sequelize init

If already initialized:

npx sequelize init --force
5. Run the Server
npm run dev

Server runs at:
👉 http://localhost:3000

📡 API Design (Sample)

Add your actual endpoints here — this is where most students fail.

Flight Routes
GET    /flights        # Fetch all flights
GET    /flights/:id   # Get flight by ID
POST   /flights       # Create new flight
Booking Routes (Planned)
POST   /bookings      # Create booking
GET    /bookings/:id  # Fetch booking details
🗄️ Database Design (Conceptual)
<img width="513" height="1277" alt="mermaid-diagram (2)" src="https://github.com/user-attachments/assets/41ca6cf3-2cd1-4cfc-bb65-01ca513529bf" />

⚡ Scalability Considerations
Stateless server design → easy horizontal scaling
Layer isolation → independent optimization possible
Future caching layer (Redis) → reduce DB load
Connection pooling via Sequelize
🔒 Security Considerations (Planned)
JWT-based authentication
Input validation middleware
Rate limiting to prevent abuse
SQL injection protection via ORM
🧪 Testing Strategy (To Be Implemented)
Unit tests for services
Integration tests for APIs
Mocking repository layer
🔮 Future Enhancements
🔐 Authentication & Role-Based Access Control
⚡ Redis Caching Layer
📊 Logging & Monitoring (Winston + ELK)
🐳 Docker & CI/CD Pipeline
💳 Payment Integration
✈️ Seat Availability & Dynamic Pricing
👨‍💻 Author

Atul Rana
