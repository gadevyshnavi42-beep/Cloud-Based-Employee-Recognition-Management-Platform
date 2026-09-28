# Cloud-Based Employee Recognition Management Platform

A simple full-stack web app where employees and managers recognise colleagues, earn points, and see a leaderboard.

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5 (+ Bootstrap Icons, Chart.js via CDN) |
| Backend | Node.js, Express.js, REST API |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt password hashing |

> The frontend is served by the backend, so you only need to start **one** server.

---

## 1. Prerequisites

1. **Node.js 18+** - https://nodejs.org (check with `node -v`)
2. **MongoDB Community Server** - https://www.mongodb.com/try/download/community
   (or a free MongoDB Atlas cluster - see "Using MongoDB Atlas" below)
3. **VS Code** (optional but recommended)

---

## 2. Run the project (step by step)

### Step 1 - Start MongoDB
- **Windows:** MongoDB normally runs as a service after installing. If not, open a terminal and run `mongod`.
- **macOS (Homebrew):** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`

### Step 2 - Install backend packages
Open the project in VS Code, open a terminal (**Terminal > New Terminal**) and run:

```bash
cd backend
npm install
```

This installs everything listed in `package.json`. To install the packages manually instead:

```bash
npm init -y
npm install express mongoose bcryptjs jsonwebtoken cors dotenv multer
npm install --save-dev nodemon
```

### Step 3 - Create the `.env` file
Copy `backend/.env.example` to `backend/.env`:

```bash
# macOS / Linux
cp .env.example .env
# Windows (Command Prompt)
copy .env.example .env
```

Open `.env` and change `JWT_SECRET` to any long random text.

### Step 4 - (Optional) Load demo data

```bash
npm run seed
```

This creates 8 demo users, the 6 categories, and 10 sample recognitions.
**It deletes existing data in this database**, so only run it on a fresh/demo database.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123 |
| Manager | manager@company.com | Manager@123 |
| Employee | priya@company.com | Password@123 |

(Other employees: rahul@, sara@, john@, meera@, david@ `company.com` - all use `Password@123`.)

You can also skip the seed and just **register** a new account on the site.
The default categories are created automatically the first time the server starts.

### Step 5 - Start the server

```bash
npm start          # normal
npm run dev        # auto-restart on file changes (nodemon)
```

You should see:

```
✅ MongoDB connected
🚀 Server running at http://localhost:5000
```

### Step 6 - Open the app
Go to **http://localhost:5000** in your browser.

*Alternative:* you can open the `frontend` folder with the VS Code **Live Server** extension (usually http://127.0.0.1:5500). The frontend automatically calls the backend at `http://localhost:5000`, so keep the backend running.

---

## 3. Features

| Page | What it does |
|------|--------------|
| `index.html` | Landing page with Login / Register buttons |
| `register.html`, `login.html` | Validated forms, JWT authentication |
| `dashboard.html` | Name, department, points, recognitions received, recent recognitions, achievements, notifications |
| `give-recognition.html` | Choose employee, category, title, message, points (1-100), optional image |
| `recognitions.html` | Feed of recognition cards with like, comment, category filter |
| `profile.html` | Profile, points, achievements, recognition history, edit profile + picture (`?id=` shows another user) |
| `leaderboard.html` | Rank, name, department, points, recognition count |
| `admin.html` | Analytics + charts, employees (add/edit/delete), recognitions, categories |

**Roles**
- **employee** - give/receive recognition, like, comment, edit own profile.
- **manager** - everything above + read-only admin panel (statistics, employee list, recognitions).
- **admin** - full control: add/edit/delete employees, delete recognitions, manage categories.

Public registration always creates an *employee*. Admins can create managers/admins from the Admin Panel.

**Notifications** are created when someone recognises you, gives you points, likes, or comments on your recognition (they appear in the bell icon and on the dashboard).

**Achievements** (badges) are calculated automatically from your points and recognition counts.

---

## 4. REST API

All routes except register/login need the header `Authorization: Bearer <token>`.

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/register` | public | Create employee account |
| POST | `/api/auth/login` | public | Login, returns token |
| GET | `/api/users` | user | List users |
| GET | `/api/users/:id` | user | User + counts + achievements |
| POST | `/api/users` | admin | Add employee |
| PUT | `/api/users/:id` | self/admin | Update (JSON or multipart with `profileImage`) |
| DELETE | `/api/users/:id` | admin | Delete user (and their recognitions) |
| POST | `/api/recognitions` | user | Create (multipart, optional `image`) |
| GET | `/api/recognitions` | user | List (`?receiver=&sender=&category=&limit=`) |
| GET | `/api/recognitions/:id` | user | One recognition |
| PUT | `/api/recognitions/:id` | sender/admin | Edit |
| DELETE | `/api/recognitions/:id` | sender/admin | Delete (points are taken back) |
| POST | `/api/recognitions/:id/like` | user | Like / unlike |
| POST | `/api/recognitions/:id/comments` | user | Add comment `{ text }` |
| GET | `/api/categories` | user | List categories |
| GET | `/api/leaderboard` | user | Ranked employees |
| GET | `/api/notifications` | user | My notifications |
| PUT | `/api/notifications/:id/read` | user | Mark one as read |
| PUT | `/api/notifications/read-all` | user | Mark all as read |
| GET | `/api/admin/dashboard` | manager/admin | Counts + recent items |
| GET | `/api/admin/statistics` | manager/admin | Totals, most recognised, by category |
| POST/PUT/DELETE | `/api/admin/categories[/:id]` | admin | Manage categories |

---

## 5. Folder structure

```
employee-recognition-platform/
├── frontend/
│   ├── index.html, login.html, register.html, dashboard.html
│   ├── give-recognition.html, recognitions.html, profile.html
│   ├── leaderboard.html, admin.html
│   ├── css/style.css
│   └── js/
│       ├── api.js         # API helper, login storage, navbar/sidebar, notifications bell
│       ├── auth.js        # login & register forms
│       ├── dashboard.js   # dashboard, leaderboard, profile pages
│       ├── recognition.js # give-recognition form + feed
│       └── admin.js       # admin panel
├── backend/
│   ├── server.js          # Express app entry point
│   ├── seed.js            # demo data (npm run seed)
│   ├── config/db.js
│   ├── models/            # User, Recognition, Notification, Category
│   ├── routes/            # auth, user, recognition, category, leaderboard, notification, admin
│   ├── middleware/        # auth (JWT), admin (roles), upload (multer)
│   ├── utils/             # validation, notifications, achievements, default categories
│   ├── uploads/           # uploaded images
│   └── .env.example
├── README.md
└── .gitignore
```

---

## 6. Using MongoDB Atlas (cloud database)

1. Create a free cluster at https://www.mongodb.com/atlas and add a database user.
2. Under *Network Access* allow your IP address.
3. Click *Connect > Drivers* and copy the connection string.
4. Put it in `backend/.env`, e.g.
   `MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/employee_recognition`

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| `MongoDB connection failed` | Start MongoDB (Step 1) and check `MONGO_URI` in `.env`. |
| `Cannot reach the server` in the browser | Make sure `npm start` is running in the `backend` folder. |
| `Port 5000 already in use` | Change `PORT` in `.env`, then open the new port. (If you use Live Server, also update `BACKEND` at the top of `frontend/js/api.js`.) |
| Charts / icons missing | They load from a CDN - you need an internet connection. |
| Login says invalid credentials after re-seeding | Use the demo accounts listed above. |
| Image upload rejected | Only jpg/png/gif/webp up to 2 MB are allowed. |

---

## 8. Notes for learners
- Passwords are hashed with **bcrypt**; the hash is never sent to the browser.
- All user text is escaped before it is inserted into the page (protects against XSS).
- Every route validates its input and returns clear JSON error messages.
- Try extending it: add pagination to the feed, email notifications, or an "edit recognition" form in the UI (the API already supports it).
