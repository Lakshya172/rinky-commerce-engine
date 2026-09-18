# Rinky Commerce Engine

**Production Full-Stack Commerce Platform for Rinky Jewellers**

> A production-oriented e-commerce platform engineered for Rinky Jewellers, Kanpur, with a focus on scalable backend architecture, secure authentication, role-based access control, database-driven product management, and a responsive customer-facing experience.

**Live Application:** https://www.rinkyjewellers.in/

---

## Overview

**Rinky Commerce Engine** is a full-stack commerce platform designed and developed to provide Rinky Jewellers with a complete digital storefront and centralized product management system

The application was engineered end-to-end, covering **frontend development, REST API design, authentication, authorization, database architecture, session management, transactional email workflows, security middleware, administrative operations, and cloud deployment**.

The platform follows a lightweight architecture with a **Node.js + Express backend**, **MongoDB Atlas persistence layer**, and a **framework-free frontend built with HTML, CSS, and vanilla JavaScript**.

The system is intentionally implemented without a frontend build pipeline, keeping the client lightweight, maintainable, and easy to deploy.

---

## Engineering Highlights

* Designed and implemented a **RESTful backend architecture** using Node.js and Express
* Built secure **user authentication and account-management workflows**
* Implemented **role-based authorization** for administrative operations
* Designed MongoDB schemas using **Mongoose**
* Implemented persistent **server-side sessions** using MongoDB
* Developed administrative APIs for **product, user, and message management**
* Built customer **wishlist functionality** with authenticated API access
* Integrated **Brevo Transactional Email API** for email verification and password recovery
* Implemented security controls using **Helmet and rate limiting**
* Added production health monitoring through a dedicated `/healthz` endpoint
* Configured production deployment using **Render**
* Integrated **MongoDB Atlas** as the cloud database layer
* Built a responsive frontend without React, Vue, Angular, or other frontend frameworks
* Structured shared client functionality into reusable JavaScript modules
* Designed the system with maintainability and future commerce functionality in mind

---

## Technology Stack

| Layer             | Technology                        |
| ----------------- | --------------------------------- |
| Runtime           | Node.js 18+                       |
| Backend           | Express.js 4                      |
| API               | REST                              |
| Database          | MongoDB Atlas                     |
| ODM               | Mongoose 8                        |
| Authentication    | Session-based Authentication      |
| Session Store     | express-session + connect-mongo   |
| Password Security | bcryptjs                          |
| Email             | Brevo Transactional API           |
| Security          | Helmet + express-rate-limit       |
| Frontend          | HTML5 + CSS3 + Vanilla JavaScript |
| Deployment        | Render                            |
| Version Control   | Git + GitHub                      |

---

## System Architecture

```text
                        ┌─────────────────────┐
                        │      Client         │
                        │ HTML / CSS / JS     │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │     Express.js      │
                        │   REST API Layer    │
                        └──────────┬──────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │ Authentication│   │   Products   │   │    Admin     │
        │ & Sessions    │   │ & Wishlist   │   │   Services   │
        └──────────────┘   └──────────────┘   └──────────────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │    Mongoose ODM     │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │    MongoDB Atlas    │
                        └─────────────────────┘

                        External Services
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          ┌──────────────┐          ┌──────────────┐
          │    Brevo     │          │    Render    │
          │ Email API    │          │   Hosting    │
          └──────────────┘          └──────────────┘
```

---

## Project Structure

```text
Rinky-Commerce-Engine/
│
├── app.js
├── render.yaml
├── package.json
├── .env.example
│
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   └── Contact.js
│
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── wishlist.js
│   ├── contact.js
│   └── admin.js
│
├── middleware/
│   └── auth.js
│
├── utils/
│   └── mailer.js
│
├── views/
│   └── *.html
│
└── public/
    ├── css/
    │   └── style.css
    │
    └── js/
        ├── shared.js
        └── navbar.js
```

---

## Core Modules

### Authentication & Authorization

The authentication layer provides complete account-management workflows:

* User registration
* Email verification
* Secure login/logout
* Session persistence
* Profile management
* Password change
* Password reset
* Role-based authorization
* Admin access control

Passwords are protected using **bcrypt hashing with 12 salt rounds** and are never exposed through API responses.

---

### Product Management

The product service provides:

* Public product catalogue
* Product detail retrieval
* Search functionality
* Category filtering
* Featured products
* Administrative product creation
* Product deletion
* Featured-status management
* Product seeding

The product model also supports jewellery-specific metadata, including **BIS hallmark-related fields**.

---

### Wishlist System

Authenticated customers can manage their personal wishlist through protected REST endpoints.

```text
GET    /api/wishlist
POST   /api/wishlist/:productId
```

Authorization middleware ensures wishlist operations are available only to authenticated users.

---

### Administrative Platform

The administrative API provides centralized management capabilities for:

* Products
* Users
* Contact messages
* Platform statistics
* Featured products
* User account management
* Password reset administration

All administrative routes are protected at the router level using dedicated authorization middleware.

---

### Transactional Email

The platform integrates **Brevo's transactional email API** for:

* Email verification
* Password reset workflows

Email URLs are dynamically generated using the configured production `BASE_URL`.

---

## REST API

### Authentication

| Method | Endpoint                        | Access        |
| ------ | ------------------------------- | ------------- |
| POST   | `/api/auth/signup`              | Public        |
| GET    | `/api/auth/verify-email/:token` | Public        |
| POST   | `/api/auth/login`               | Public        |
| POST   | `/api/auth/logout`              | Authenticated |
| POST   | `/api/auth/forgot-password`     | Public        |
| POST   | `/api/auth/reset-password`      | Public        |
| GET    | `/api/auth/me`                  | Public        |
| PUT    | `/api/auth/profile`             | Authenticated |
| PUT    | `/api/auth/change-password`     | Authenticated |

### Products

| Method | Endpoint            | Access |
| ------ | ------------------- | ------ |
| GET    | `/api/products`     | Public |
| GET    | `/api/products/:id` | Public |

### Wishlist

| Method | Endpoint                   | Access        |
| ------ | -------------------------- | ------------- |
| GET    | `/api/wishlist`            | Authenticated |
| POST   | `/api/wishlist/:productId` | Authenticated |

### Administration

| Method | Endpoint                              | Access |
| ------ | ------------------------------------- | ------ |
| GET    | `/api/admin/stats`                    | Admin  |
| GET    | `/api/admin/products`                 | Admin  |
| GET    | `/api/admin/messages`                 | Admin  |
| GET    | `/api/admin/users`                    | Admin  |
| POST   | `/api/admin/products`                 | Admin  |
| POST   | `/api/admin/seed`                     | Admin  |
| POST   | `/api/admin/users/:id/reset-password` | Admin  |
| PATCH  | `/api/admin/products/:id/featured`    | Admin  |
| DELETE | `/api/admin/products/:id`             | Admin  |
| DELETE | `/api/admin/messages/:id`             | Admin  |
| DELETE | `/api/admin/users/:id`                | Admin  |

---

## Security Engineering

Security was treated as a core part of the application architecture rather than an afterthought.

### Implemented

* **bcrypt password hashing**
* **HTTP-only session cookies**
* **SameSite cookie protection**
* **Secure cookies in production**
* **MongoDB-backed sessions**
* **Role-based authorization**
* **Admin route protection**
* **Email verification**
* **Password-reset token workflows**
* **Helmet security middleware**
* **IP-based API rate limiting**
* Environment-based secret management
* No credentials committed to source control

Credential-sensitive endpoints are rate limited to reduce brute-force and abuse scenarios.

### Security Consideration

Content Security Policy is currently disabled because the application uses external resources and inline scripts/styles. A stricter CSP can be introduced by migrating inline resources to approved external assets or nonce-based execution.

---

## Production Deployment

The application is deployed as a production web service with:

```text
Frontend
   ↓
Express Application
   ↓
Render
   ↓
MongoDB Atlas
```

Production configuration includes:

* Environment-based configuration
* Secure cookies
* Proxy-aware Express configuration
* MongoDB Atlas connection
* Production `BASE_URL`
* Transactional email integration
* Health monitoring

### Health Check

```http
GET /healthz
```

Returns:

```text
200 → Application and MongoDB available
503 → Database unavailable
```

---

## Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd rinky-commerce-engine
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Configure MongoDB and required service credentials inside `.env`.

### 4. Start the application

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## Current Scope

The current production implementation includes:

* Customer-facing storefront
* Product catalogue
* Product search and filtering
* User authentication
* Email verification
* Password recovery
* User profiles
* Wishlist management
* Admin dashboard
* Product administration
* User administration
* Contact management
* Transactional email
* Production deployment
* Security middleware

### Future Engineering Roadmap

The architecture is prepared for future commerce capabilities, including:

* Shopping cart
* Checkout workflow
* Order management
* Razorpay payment integration
* Customer order history
* Delivery/order tracking
* Inventory management
* Advanced analytics
* Automated order notifications

> **Note:** Cart, checkout, and payment processing are not currently implemented. The existing `Order` model and Razorpay dependency represent planned infrastructure and should not be considered active production functionality.

---

## Engineering Decisions

### Why Vanilla JavaScript?

The frontend intentionally avoids a framework and build system to keep the storefront lightweight and straightforward to deploy. Shared functionality is organized into reusable JavaScript modules rather than duplicated across pages.

### Why MongoDB?

MongoDB provides a flexible document-oriented data model suitable for catalogue-driven commerce applications while integrating cleanly with Node.js through Mongoose.

### Why Server-Side Sessions?

Authentication uses server-side sessions backed by MongoDB, allowing session state to be centrally managed and invalidated without exposing authentication tokens to client-side JavaScript.

### Why REST?

REST APIs provide a clear separation between the presentation layer and backend services while keeping the architecture simple and extensible for future mobile clients or frontend frameworks.

---

## Project Status

**Status:** Production

**Deployment:** Live

**Architecture:** Full-Stack REST API

**Database:** MongoDB Atlas

**Frontend:** Framework-free

**Backend:** Node.js + Express

---

## Live Project

**Rinky Jewellers**

https://www.rinkyjewellers.in/

---

## Author

**Lakshya Agarwal**

Full-Stack Software Developer
B.Tech Computer Science Engineering

---

> **Built as a real-world production project for Rinky Jewellers, Awas Vikas, Kanpur — from architecture and implementation to deployment.**
