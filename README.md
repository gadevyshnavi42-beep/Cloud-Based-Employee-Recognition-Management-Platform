# ☁️ Cloud-Based Employee Recognition Management Platform

A full-stack web application designed to help organizations recognize, appreciate, and reward employees for their achievements, teamwork, innovation, leadership, and contributions.

## 📌 Project Overview

The **Cloud-Based Employee Recognition Management Platform** provides a centralized platform where employees and managers can recognize team members and track achievements.

The system includes employee authentication, recognition management, points, notifications, leaderboards, and an admin dashboard.

## 🎯 Objectives

* Recognize employee achievements and contributions
* Encourage teamwork and collaboration
* Track employee recognition points
* Provide a transparent recognition feed
* Display employee rankings through a leaderboard
* Provide administrators with recognition analytics
* Store employee and recognition data securely in the cloud database

## ✨ Features

### 👤 Employee Management

* Employee registration and login
* JWT-based authentication
* Employee profile
* Department and employee ID management
* Role-based access

### 🏆 Employee Recognition

Employees can recognize colleagues for:

* Teamwork
* Innovation
* Leadership
* Performance
* Customer Service
* Helping Others

Each recognition can contain:

* Recognition title
* Message
* Category
* Points
* Date
* Sender and receiver information

### 📊 Dashboard

The employee dashboard displays:

* Total recognitions received
* Recognition points
* Recent recognitions
* Employee achievements
* Notifications

### 🏅 Leaderboard

Employees can be ranked based on recognition points.

The leaderboard displays:

* Rank
* Employee name
* Department
* Recognition points
* Recognition count

### 🔔 Notifications

Employees receive notifications when:

* They receive recognition
* They receive points
* Someone likes their recognition
* Someone comments on their recognition

### 👨‍💼 Admin Dashboard

Administrators can:

* View employees
* Add employees
* Edit employee details
* Delete employees
* View recognitions
* Manage recognition categories
* View platform statistics

### 📈 Analytics

The platform provides statistics such as:

* Total employees
* Total recognitions
* Total recognition points
* Most recognized employees
* Recognition category statistics

## 🛠️ Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Node.js
* Express.js
* REST API

### Database

* MongoDB

### Authentication

* JSON Web Token (JWT)

### Development Tools

* Visual Studio Code
* Git
* GitHub
* MongoDB

## 📂 Project Structure

```text
Cloud-Based-Employee-Recognition-Management-Platform/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── give-recognition.html
│   ├── recognitions.html
│   ├── profile.html
│   ├── leaderboard.html
│   ├── admin.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── recognition.js
│       └── admin.js
│
├── backend/
│   ├── server.js
│   ├── seed.js
│   │
│   ├── config/
│   │   └── db.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Recognition.js
│   │   ├── Notification.js
│   │   └── Category.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── recognitionRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── categoryRoutes.js
│   │   └── adminRoutes.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   └── upload.js
│   │
│   └── utils/
│       ├── defaultCategories.js
│       ├── notify.js
│       ├── stats.js
│       └── validate.js
│
├── .gitignore
└── README.md
```

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/gadevyshnavi42-beep/Cloud-Based-Employee-Recognition-Management-Platform.git
```

### 2. Open the Project

```bash
cd Cloud-Based-Employee-Recognition-Management-Platform
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Do not upload your actual `.env` file to GitHub.

### 5. Start the Backend

```bash
npm start
```

The backend will run on:

```text
http://loca
```
